"use server";

import { db } from "@/db";
import { guests } from "@/db/schema";
import postgres from "postgres";

// Use direct PostgreSQL connection (DATABASE_URL) to bypass RLS
let sql: ReturnType<typeof postgres> | null = null;
try {
  if (process.env.DATABASE_URL) {
    sql = postgres(process.env.DATABASE_URL);
  }
} catch {
  /* offline or missing */
}

export async function getSyncStatus() {
  return {
    available: sql !== null,
  };
}

export async function pullFromSupabase() {
  if (!sql) {
    return {
      success: false,
      error:
        "Supabase not configured. Add DATABASE_URL to .env.local",
    };
  }

  try {
    const data = await sql`SELECT * FROM guests`;

    if (!data || data.length === 0) {
      return {
        success: true,
        pulled: 0,
        message: "No guests found in Supabase.",
      };
    }

    let pulled = 0;
    for (const row of data) {
      try {
        await db
          .insert(guests)
          .values({
            name: row.name,
            email: row.email,
            qr_code_id: row.qr_code_id || row.email,
            is_checked_in: row.is_checked_in || false,
            checked_in_at: row.checked_in_at
              ? new Date(row.checked_in_at)
              : null,
            email_sent: row.email_sent || false,
          })
          .onConflictDoUpdate({
            target: guests.email,
            set: {
              name: row.name,
              qr_code_id: row.qr_code_id || row.email,
              is_checked_in: row.is_checked_in || false,
              checked_in_at: row.checked_in_at
                ? new Date(row.checked_in_at)
                : null,
              email_sent: row.email_sent || false,
            },
          });
        pulled++;
      } catch (dbErr) {
        console.error(`Failed to upsert ${row.email}:`, dbErr);
      }
    }

    return {
      success: true,
      pulled,
      message: `Pulled ${pulled} guests from Supabase.`,
    };
  } catch (err) {
    console.error("Pull from Supabase failed:", err);
    return { success: false, error: "Pull failed. Check console for details." };
  }
}

export async function pushToSupabase() {
  if (!sql) {
    return {
      success: false,
      error:
        "Supabase not configured. Add DATABASE_URL to .env.local",
    };
  }

  try {
    const localGuests = await db.select().from(guests).all();

    if (localGuests.length === 0) {
      return { success: true, pushed: 0, message: "No local guests to push." };
    }

    let pushed = 0;
    for (const guest of localGuests) {
      try {
        await sql`
          INSERT INTO guests (name, email, qr_code_id, is_checked_in, checked_in_at, email_sent)
          VALUES (
            ${guest.name},
            ${guest.email},
            ${guest.qr_code_id},
            ${guest.is_checked_in},
            ${guest.checked_in_at ? guest.checked_in_at.toISOString() : null},
            ${guest.email_sent}
          )
          ON CONFLICT (email) DO UPDATE SET
            name = ${guest.name},
            qr_code_id = ${guest.qr_code_id},
            is_checked_in = ${guest.is_checked_in},
            checked_in_at = ${guest.checked_in_at ? guest.checked_in_at.toISOString() : null},
            email_sent = ${guest.email_sent}
        `;
        pushed++;
      } catch (pushErr) {
        console.error(`Push error for ${guest.email}:`, pushErr);
      }
    }

    return {
      success: true,
      pushed,
      message: `Pushed ${pushed} guests to Supabase.`,
    };
  } catch (err) {
    console.error("Push to Supabase failed:", err);
    return { success: false, error: "Push failed. Check console for details." };
  }
}
