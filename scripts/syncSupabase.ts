import { google } from "googleapis";
import postgres from "postgres";
import crypto from "crypto";
import { db } from "../src/db";
import { guests } from "../src/db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!);

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT!);

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function main() {
  console.log("🔄 Starting Google Sheets → Supabase + SQLite sync...");

  try {
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = process.env.SHEET_NAME || "Sheet2";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A2:E1001`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log("Sheet is empty. Nothing to sync.");
      process.exit(0);
    }

    console.log(`Found ${rows.length} total rows in Sheet. Processing...`);

    let supabaseSynced = 0;
    let sqliteSynced = 0;
    let skippedCount = 0;

    const toTitleCase = (str: string) =>
      str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    // Batch SQLite operations in a transaction for speed and to avoid SQLITE_BUSY
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawName = row[1]?.trim();
        const email = row[2]?.trim().toLowerCase();
        const fullName = rawName ? toTitleCase(rawName) : "";

        if (!email || !fullName) {
          skippedCount++;
          continue;
        }

        const qrId = crypto.randomUUID();

        // Supabase (PostgreSQL) - Keep this outside if possible, but for simplicity we keep the loop structure
        try {
          await sql`
            INSERT INTO guests (name, email, qr_code_id)
            VALUES (${fullName}, ${email}, ${qrId})
            ON CONFLICT (email) DO UPDATE SET
              name = ${fullName}
          `;
          supabaseSynced++;
        } catch (dbError) {
          console.error(`❌ Supabase failed for ${email}:`, dbError);
        }

        // Local SQLite - Now using 'tx' instead of 'db'
        try {
          await tx
            .insert(guests)
            .values({
              name: fullName,
              email: email,
              qr_code_id: qrId,
            })
            .onConflictDoUpdate({
              target: guests.email,
              set: {
                name: fullName,
              },
            });
          sqliteSynced++;
        } catch (dbError) {
          console.error(`❌ SQLite failed for ${email}:`, dbError);
        }
      }
    });
    // Collect all valid emails from the sheet
    const validEmails = new Set<string>();
    for (const row of rows) {
      const email = row[2]?.trim().toLowerCase();
      if (email) validEmails.add(email);
    }

    // Delete SQLite records not in the sheet anymore
    const allLocal = await db
      .select({ id: guests.id, email: guests.email })
      .from(guests)
      .all();
    let removed = 0;
    for (const local of allLocal) {
      if (!validEmails.has(local.email)) {
        await db.delete(guests).where(eq(guests.id, local.id));
        removed++;
      }
    }

    console.log(`\n✅ Sync finished successfully!`);
    console.log(`- Supabase: ${supabaseSynced} synced`);
    console.log(`- SQLite:   ${sqliteSynced} synced`);
    console.log(`- Removed:  ${removed} stale SQLite records`);
    console.log(`- Skipped:  ${skippedCount} (missing email or name)`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("The sync script violently crashed:", error);
    await sql.end();
    process.exit(1);
  }
}

main();
