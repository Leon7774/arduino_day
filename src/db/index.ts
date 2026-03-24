import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

// We use file: prefix for local sqlite with libsql
const client = createClient({ url: 'file:sqlite.db' });
export const db = drizzle(client, { schema });
