import QRCode from 'qrcode';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

const qrCodesDir = path.join(process.cwd(), 'qr-codes');

// Create the qr-codes folder if it doesn't exist
if (!fs.existsSync(qrCodesDir)) {
  fs.mkdirSync(qrCodesDir);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("=== QR Code Generator ===");
console.log(`Images will be saved to: ${qrCodesDir}`);
console.log("Type 'exit' or 'quit' to stop.");

const askForInput = () => {
  rl.question('\nEnter text for QR code: ', async (input) => {
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Exiting...');
      rl.close();
      return;
    }

    if (input.trim()) {
      try {
        // Create a safe filename out of the input
        const safeFilename = input.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.png';
        const fp = path.join(qrCodesDir, safeFilename);

        await QRCode.toFile(fp, input, {
          width: 400,
          margin: 2
        });

        console.log(`✅ Saved QR code to: ${fp}`);
      } catch (err) {
        console.error("❌ Error generating QR code:", err);
      }
    } else {
      console.log("Please enter some text.");
    }

    // Ask again
    askForInput();
  });
};

askForInput();
