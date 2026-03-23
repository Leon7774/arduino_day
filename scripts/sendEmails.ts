import * as QRCode from 'qrcode';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { db } from '../src/db';
import { guests } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY!);

const chunkArray = (arr: any[], size: number) => 
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const IS_DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  if (IS_DRY_RUN) console.log('⚠️ RUNNING IN DRY-RUN MODE. NO EMAILS WILL BE SENT. ⚠️\n');

  try {
    const pendingGuests = await db.select().from(guests).where(eq(guests.email_sent, false));

    if (!pendingGuests || pendingGuests.length === 0) {
      console.log('No participants waiting for tickets. Pack it up.');
      process.exit(0);
    }

    console.log(`Found ${pendingGuests.length} participants waiting for tickets.\n`);

    const batches = chunkArray(pendingGuests, 50);

    for (const batch of batches) {
      const emailPromises = batch.map(async (guest) => {
        const email = guest.email.toLowerCase();
        const fullName = guest.name;

        if (!email) {
          console.log(`[WARNING] Skipping Guest ID ${guest.id}: No email found.`);
          return;
        }

        try {
          // 1. Generate local QR for the email attachment
          const qrCodeDataURI = await QRCode.toDataURL(email, {
            errorCorrectionLevel: 'H',
            margin: 2,
            width: 500
          });
          const base64Data = qrCodeDataURI.split(',')[1];

          if (IS_DRY_RUN) {
            console.log(`[DRY RUN] Would email: ${email} | Would update guests set email_sent=true for ID ${guest.id}`);
          } else {
            // Send via Resend
            const result = await resend.emails.send({
              from: 'Arduino Day <arduinoday-noreply@destura.me>', 
              to: email,
              subject: `Your Ticket to Arduino Day Philippines 2026!`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; color: #333; line-height: 1.6;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqGZ2q_B3lHd4S4KdtU8X_869M3PpGPlMZow&s" alt="Arduino Day" style="max-width: 100%; border-radius: 8px;" />
                  </div>
                  <p>Beep boop bop… signal received!</p>
                  <p>You’re officially connected to Arduino Day Philippines, <strong>${fullName}</strong> 🤖⚡<br/>
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
                  <p>Get ready to explore circuits, code, and creativity with fellow innovators. We can't wait to see you there!</p>
                  <p>Stay charged,<br/>
                  <a href="https://arduinoday.ph">Arduino Day Philippines</a><br/>
                  <p>If you have any concerns, feel free to reach out to any of the following:</p>
                  <ul>
                    <li><a href="mailto:galileon.destura@gmail.com">galileon.destura@gmail.com</a></li>
                    <li><a href="mailto:maclangw26@gmail.com">maclangw26@gmail.com</a></li>
                  </ul>
                  <strong>The Organizing Team</strong></p>
                </div>
              `,
              attachments: [
                {
                  filename: `ticket-${fullName.replace(/\s+/g, '-')}.png`,
                  content: base64Data,
                },
                {
                  filename: `qr-inline.png`,
                  content: base64Data,
                  contentId: 'ticket-qr',
                }
              ],
            });

            if(result.error){
              console.error(`❌ Failed processing ${email} (Guest ID ${guest.id}):`, result.error);
              return;
            } else {
              console.log(`✅ Ticket delivered to ${email}`);
            }

            // Update email_sent to true in Supabase via Drizzle!
            await db.update(guests)
              .set({ email_sent: true })
              .where(eq(guests.id, guest.id));
          }
        } catch (err) {
          console.error(`❌ Failed processing ${email} (Guest ID ${guest.id}):`, err);
        }
      });

      await Promise.all(emailPromises);
      
      if (!IS_DRY_RUN) {
        console.log('Batch complete, pausing to avoid rate limits...');
        await sleep(2000); 
      }
    }

    console.log('\nExecution finished.');
    process.exit(0);

  } catch (error) {
    console.error('The script violently crashed:', error);
    process.exit(1);
  }
}

main();