import { google } from 'googleapis';
import * as QRCode from 'qrcode';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY!);

const auth = new google.auth.GoogleAuth({
  keyFile: './service-account.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

const chunkArray = (arr: any[], size: number) => 
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const IS_DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  if (IS_DRY_RUN) console.log('⚠️ RUNNING IN DRY-RUN MODE. NO EMAILS WILL BE SENT. ⚠️\n');

  try {
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = process.env.SHEET_NAME || 'Sheet1'; // Handles the tab name issue
    
    // Grabbing Columns A through M now
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A2:M1001`, 
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return console.log('Sheet is empty. Pack it up.');

    // Filter by Column M (Index 12) for the 'SENT' status
    const pendingRows = rows.map((row, index) => ({ row, index: index + 2 }))
                            .filter(({ row }) => row[12] !== 'SENT');

    console.log(`Found ${pendingRows.length} participants waiting for tickets.\n`);

    const batches = chunkArray(pendingRows, 50);

    for (const batch of batches) {
      const emailPromises = batch.map(async ({ row, index }) => {
        const fullName = row[1]?.trim();
        const email = row[2]?.trim().toLowerCase();
        const affiliation = row[5]?.trim() || 'Guest';

        if (!email) {
          console.log(`[WARNING] Skipping Row ${index}: No email found.`);
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

          // 2. The formula to render the QR visually in Google Sheets
          const sheetQRFormula = `=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(email)}")`;

          if (IS_DRY_RUN) {
            console.log(`[DRY RUN] Would email: ${email} | Would write Formula to L${index} | Would mark M${index} as SENT`);
          } else {
            
            // Send via Resend
            const result = await resend.emails.send({
              from: 'Arduino Day <arduinoday@destura.me>', 
              to: email,
              subject: `hi waks sorry im testing different qr code sizes HJWAHJWAJHAW`,
              html: `
                <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
                  <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqGZ2q_B3lHd4S4KdtU8X_869M3PpGPlMZow&s" alt="Arduino Day" style="max-width: 100%; border-radius: 8px;" />
                  </div>
                  <h2 style="color: #333;">You're in, ${fullName}!</h2>
                  <p>We are excited to see you representing <strong>${affiliation}</strong> at the event.</p>
                  <p>Attached is your official QR Code ticket. <strong>Do not lose this.</strong> You will need to present this at the registration desk for scanning.</p>
                  <p>See you there,<br/>The Organizing Team</p>
                </div>
              `,
              attachments: [
                {
                  filename: `ticket-${fullName.replace(/\s+/g, '-')}.png`,
                  content: base64Data,
                },
              ],
            });

            if(result.error){
              console.error(`❌ Failed processing ${email} at row ${index}:`, result.error);
              return;
            } else {
              console.log(`✅ Ticket delivered to ${email}`);
            }

            // Update both Column L (QR Formula) and Column M (Status) at the same time
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `'${sheetName}'!L${index}:M${index}`, // Updating two columns at once
              valueInputOption: 'USER_ENTERED', // Required so the formula actually renders the image
              requestBody: { 
                values: [[sheetQRFormula, 'SENT']] 
              },
            });

            
          }
        } catch (err) {
          console.error(`❌ Failed processing ${email} at row ${index}:`, err);
        }
      });

      await Promise.all(emailPromises);
      
      if (!IS_DRY_RUN) {
        console.log('Batch complete, pausing to avoid rate limits...');
        await sleep(2000); 
      }
    }

    console.log('\nExecution finished.');

  } catch (error) {
    console.error('The script violently crashed:', error);
  }
}

main();