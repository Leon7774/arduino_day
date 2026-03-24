import { NextResponse } from "next/server";
import { db } from "@/db";
import { guests } from "@/db/schema";
import { eq } from "drizzle-orm";
import postgres from "postgres";

// Supabase direct connection for fallback and real-time sync
const supabaseUrl = process.env.DATABASE_URL;
const sql = supabaseUrl ? postgres(supabaseUrl) : null;

export async function POST(request: Request) {
  try {
    const { qrCodeId, rawString } = await request.json();

    console.log("📥 [API] Check-in request received!");
    console.log("   - Raw String:", rawString);
    console.log("   - Parsed ID:", qrCodeId);
    console.log("   - Time:", new Date().toISOString());

    if (!qrCodeId) {
      return NextResponse.json(
        { error: "QR Code is required" },
        { status: 400 }
      );
    }

    let guest: any = null;
    let source: "sqlite" | "supabase" = "sqlite";

    // 1. Try local SQLite first (Fastest/Offline-first)
    const sqliteResult = await db
      .select()
      .from(guests)
      .where(eq(guests.qr_code_id, qrCodeId))
      .limit(1);

    if (sqliteResult.length > 0) {
      guest = sqliteResult[0];
      source = "sqlite";
      console.log("✅ [API] Found guest in local SQLite");
    } 
    // 2. Fallback to Supabase if not found locally (Useful for Vercel or out-of-sync local db)
    else if (sql) {
      console.log("🔍 [API] Not found in SQLite, checking Supabase...");
      try {
        // Debug: Check how many guests are in Supabase total
        const countRes = await sql`SELECT count(*) FROM guests`;
        console.log(`📊 [API] Total guests in Supabase: ${countRes[0].count}`);

        const supabaseResult = await sql`
          SELECT * FROM guests WHERE qr_code_id = ${qrCodeId.trim()} LIMIT 1
        `;
        
        if (supabaseResult.length > 0) {
          guest = supabaseResult[0];
          source = "supabase";
          console.log("✅ [API] Found guest in Supabase:", guest.name);
        } else {
          console.log("❌ [API] Still not found in Supabase for ID:", qrCodeId);
        }
      } catch (err) {
        console.error("❌ [API] Supabase fallback query failed:", err);
      }
    }

    if (!guest) {
      return NextResponse.json(
        { error: "Invalid OR unrecognized QR Code" },
        { status: 404 }
      );
    }

    // Standardize the boolean field (Postgres returns true/false, SQLite might return 0/1)
    const isCheckedIn = typeof guest.is_checked_in === 'boolean' 
      ? guest.is_checked_in 
      : guest.is_checked_in === 1;

    if (isCheckedIn) {
      return NextResponse.json(
        { error: `Already checked in! (${guest.name})` },
        { status: 400 }
      );
    }

    const checkInTime = new Date();

    // 3. Update BOTH databases (Best effort for sync)
    
    // Update local SQLite
    try {
      await db
        .update(guests)
        .set({
          is_checked_in: true,
          checked_in_at: checkInTime,
        })
        .where(eq(guests.qr_code_id, qrCodeId));
      console.log("💾 [API] Updated local SQLite");
    } catch (err) {
      console.warn("⚠️ [API] Failed to update local SQLite:", err);
    }

    // Update Supabase
    if (sql) {
      try {
        await sql`
          UPDATE guests 
          SET is_checked_in = true, 
              checked_in_at = ${checkInTime.toISOString()} 
          WHERE qr_code_id = ${qrCodeId}
        `;
        console.log("☁️ [API] Updated Supabase");
      } catch (err) {
        console.warn("⚠️ [API] Failed to update Supabase:", err);
      }
    }

    return NextResponse.json({
      success: true,
      name: guest.name,
      source: source,
    });
  } catch (error) {
    console.error("❌ [API] Check-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
