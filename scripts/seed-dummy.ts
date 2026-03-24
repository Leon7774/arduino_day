import { db } from "../src/db";
import { guests } from "../src/db/schema";
import dotenv from "dotenv";
import * as QRCode from "qrcode";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: ".env.local" });

async function main() {
  const dummyGuests = Array.from({ length: 50 }, (_, i) => ({
    name: `Dummy Guest ${i + 1}`,
    email: `dummy${i + 1}@dummy.local`,
    qr_code_id: `dummy${i + 1}@dummy.local`,
  }));

  console.log("Seeding dummy guests...");

  const qrCodesDir = path.join(process.cwd(), "qr-codes", "dummies");
  if (!fs.existsSync(qrCodesDir)) {
    fs.mkdirSync(qrCodesDir, { recursive: true });
  }

  for (const guest of dummyGuests) {
    try {
      await db
        .insert(guests)
        .values({ ...guest, is_checked_in: false, email_sent: true }) // pretend email was sent so they don't get processed by sendEmails.ts
        .onConflictDoUpdate({
          target: guests.email,
          set: {
            name: guest.name,
            qr_code_id: guest.qr_code_id,
            is_checked_in: false,
          },
        });

      console.log(`✅ Inserted ${guest.name} into database.`);

      const fp = path.join(qrCodesDir, `${guest.email}.png`);
      await QRCode.toFile(fp, guest.qr_code_id, {
        width: 400,
        margin: 2,
      });
      console.log(`✅ Generated QR code at ${fp}`);
    } catch (err) {
      console.error(`❌ Failed to process ${guest.email}:`, err);
    }
  }

  console.log("Done! You can find the dummy QR codes in qr-codes/dummies/");
  process.exit(0);
}

main();
