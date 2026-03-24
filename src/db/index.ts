import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });

// We use an absolute path so that Next.js consistently finds the right database file
// In an Electron production package, SQLITE_DB_PATH points to a writable user directory.
const dbPath =
  process.env.SQLITE_DB_PATH || path.join(process.cwd(), "sqlite.db");
const client = createClient({ url: `file:${dbPath}` });

// Auto-create the guests table if it doesn't exist (critical for Electron where drizzle-kit push isn't available)
client.execute(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    qr_code_id TEXT NOT NULL UNIQUE,
    is_checked_in INTEGER NOT NULL DEFAULT 0,
    checked_in_at INTEGER,
    email_sent INTEGER NOT NULL DEFAULT 0
  )
`).catch((err) => console.error("Auto-migration failed:", err));

export const db = drizzle(client, { schema });
