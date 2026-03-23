import { google } from 'googleapis';
import { db } from '../src/db';
import { guests } from '../src/db/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  console.log('🔄 Starting Google Sheets to Supabase sync...');

  try {
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = process.env.SHEET_NAME || 'Sheet1';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A2:E1001`, // Grabbing Name and Email
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('Sheet is empty. Nothing to sync.');
      process.exit(0);
    }

    console.log(`Found ${rows.length} total rows in Sheet. Processing...`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = row[1]?.trim();
      const email = row[2]?.trim().toLowerCase();

      if (!email || !fullName) {
        skippedCount++;
        continue;
      }

      try {
        await db.insert(guests)
          .values({
            name: fullName,
            email: email,
            qr_code_id: email, // Setting the qr code content directly to email to match the attachments
          })
          .onConflictDoUpdate({
            target: guests.email,
            set: {
              name: fullName,
              qr_code_id: email, // Update in case they changed spelling
            },
          });
        
        syncedCount++;
      } catch (dbError) {
        console.error(`❌ Failed inserting/upserting ${email}:`, dbError);
      }
    }

    console.log(`\n✅ Sync finished successfully!`);
    console.log(`- Synced: ${syncedCount} participants`);
    console.log(`- Skipped: ${skippedCount} (missing email or name)`);

    process.exit(0);

  } catch (error) {
    console.error('The sync script violently crashed:', error);
    process.exit(1);
  }
}

main();
