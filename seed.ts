import { db } from './src/db';
import { guests } from './src/db/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  await db.insert(guests).values({
    name: 'Leon (Test Guest)',
    email: 'leon@test.com',
    qr_code_id: 'test-qr-123',
    is_checked_in: false,
  });
  console.log('Test guest inserted: Leon (QR: test-qr-123)');
  process.exit(0);
}
main().catch(console.error);
