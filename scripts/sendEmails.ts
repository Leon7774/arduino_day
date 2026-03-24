import * as QRCode from "qrcode";
import nodemailer from "nodemailer";
import postgres from "postgres";
import dotenv from "dotenv";
import { db } from "../src/db";
import { guests } from "../src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

// Optional Supabase connection — won't break if offline
let supabaseSql: ReturnType<typeof postgres> | null = null;
try {
  if (process.env.DATABASE_URL) {
    supabaseSql = postgres(process.env.DATABASE_URL);
  }
} catch {
  /* offline, skip */
}

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error(
    "❌ Missing Gmail credentials in .env.local (GMAIL_USER, GMAIL_APP_PASSWORD)",
  );
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 1, // Restrict to a single connection to dodge parallel login limits
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const chunkArray = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size),
  );

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const IS_DRY_RUN = process.env.DRY_RUN === "true";

async function main() {
  if (IS_DRY_RUN)
    console.log("⚠️ RUNNING IN DRY-RUN MODE. NO EMAILS WILL BE SENT. ⚠️\n");

  try {
    // Fetch pending guests from Supabase (source of truth for email state)
    const pendingGuests = await supabaseSql!`
      SELECT id, name, email, qr_code_id, email_sent FROM guests WHERE email_sent = false
    `;

    if (!pendingGuests || pendingGuests.length === 0) {
      console.log("No participants waiting for tickets. Pack it up.");
      process.exit(0);
    }

    console.log(
      `Found ${pendingGuests.length} participants waiting for tickets.\n`,
    );

    const batches = chunkArray(pendingGuests, 50);

    for (const batch of batches) {
      for (const guest of batch) {
        const email = guest.email.toLowerCase();
        const fullName = guest.name;

        if (!email) {
          console.log(
            `[WARNING] Skipping Guest ID ${guest.id}: No email found.`,
          );
          return;
        }

        try {
          // 1. Generate local QR for the email attachment (uses UUID qr_code_id, NOT email)
          const qrCodeDataURI = await QRCode.toDataURL(guest.qr_code_id, {
            errorCorrectionLevel: "H",
            margin: 2,
            width: 500,
          });
          const base64Data = qrCodeDataURI.split(",")[1];

          if (IS_DRY_RUN) {
            console.log(
              `[DRY RUN] Would email: ${email} | Would update guests set email_sent=true for ID ${guest.id}`,
            );
          } else {
            // Send via Nodemailer
            await transporter.sendMail({
              from: '"Arduino Day Mindanao 2026" <arduinoday-noreply@destura.me>',
              to: email,
              subject: `Your Ticket to Arduino Day Mindanao 2026!`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; color: #333; line-height: 1.6;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://drive.google.com/uc?export=view&id=1NZnxhzzyXF4aPk2XroHQ823sddq06dML" alt="Arduino Day" style="max-width: 100%; border-radius: 8px;" />
                  </div>
                  <p>Beep boop bop… signal received!</p>
                  <p>You’re officially connected to Arduino Day Mindanao 2026, <strong>${fullName}</strong> 🤖⚡<br/>
                  Our system confirms your presence as a valued guest, and we are beyond excited to have you join us for a day full of innovation, creativity, and tech magic!</p>
                  <p>🔌 Before you boot up and arrive, please remember to bring:</p>
                  <ul style="margin: 0 0 20px 0;">
                    <li>Your valid ID/student ID (for verification)</li>
                    <li>Your QR Code</li>
                    <li>Your energy and curiosity 💡</li>
                  </ul>
                  <p>📎 Your QR Code is attached to this email — this is your entry pass, so make sure to <strong>SAVE IT</strong> for scanning upon arrival!</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your Entry Pass:</p>
                    <img src="cid:ticket-qr" alt="QR Code" style="width: 250px; height: 250px; border: 2px solid #eaeaea; border-radius: 8px; padding: 10px;" />
                  </div>
                  <p>📋 Check out the <a href="https://drive.google.com/file/d/1CDarCpxNWatleg3QktN7I0tF4xZvYSWI/view?usp=sharing" style="color: #0077cc; font-weight: bold;">Program Flow</a> so you know what to expect on the big day!</p>
                  <p>Get ready to explore circuits, code, and creativity with fellow innovators. We can't wait to see you there!</p>
                  <p>If you have any concerns, feel free to reach out to any of the following:</p>
                  <ul>
                    <li>Leon Destura | <a href="mailto:galileon.destura@gmail.com">galileon.destura@gmail.com</a></li>
                    <li>Wakin Maclang | <a href="mailto:maclangw26@gmail.com">maclangw26@gmail.com</a></li>
                  </ul>
                  <p>Stay charged,<br/>
                  <strong>CreateLabz & USeP - AGILab Innovation Hub</strong></p>
                </div>
              `,
              attachments: [
                {
                  filename: `ticket-${fullName.replace(/\s+/g, "-")}.png`,
                  content: base64Data,
                  encoding: "base64",
                },
                {
                  filename: `qr-inline.png`,
                  content: base64Data,
                  encoding: "base64",
                  cid: "ticket-qr",
                },
              ],
            });

            console.log(`✅ Ticket delivered to ${email}`);

            // Update email_sent in local SQLite (primary)
            await db
              .update(guests)
              .set({ email_sent: true })
              .where(eq(guests.id, guest.id));

            // Mirror to Supabase (best-effort, won't crash if offline)
            if (supabaseSql) {
              try {
                await supabaseSql`
                  UPDATE guests SET email_sent = true WHERE email = ${email}
                `;
              } catch {
                console.warn(
                  `⚠️  Supabase sync skipped for ${email} (offline?)`,
                );
              }
            }
          }
        } catch (err) {
          console.error(
            `❌ Failed processing ${email} (Guest ID ${guest.id}):`,
            err,
          );
        }

        // Add a 1.5s delay between individual emails to prevent Gmail rate limits (454-4.7.0)
        if (!IS_DRY_RUN) await sleep(1500);
      }

      if (!IS_DRY_RUN) {
        console.log("Batch complete, pausing to avoid rate limits...");
        await sleep(2000);
      }
    }

    console.log("\nExecution finished.");
    process.exit(0);
  } catch (error) {
    console.error("The script violently crashed:", error);
    process.exit(1);
  }
}

main();
