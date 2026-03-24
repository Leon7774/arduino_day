import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

// We use an absolute path so that Next.js consistently finds the right database file
const dbPath = path.join(process.cwd(), 'sqlite.db');
const client = createClient({ url: `file:${dbPath}` });

export const db = drizzle(client, { schema });
