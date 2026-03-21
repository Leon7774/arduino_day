import { NextResponse } from "next/server";
import { db } from "@/db";
import { guests } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { qrCodeId, rawString } = await request.json();

    console.log("Check-in request received:");
    console.log("- Raw QR String:", rawString);
    console.log("- Parsed ID sent to DB:", qrCodeId);

    if (!qrCodeId) {
      return NextResponse.json(
        { error: "QR Code is required" },
        { status: 400 }
      );
    }

    // Find the guest by QR Code ID
    const guestResult = await db
      .select()
      .from(guests)
      .where(eq(guests.qr_code_id, qrCodeId))
      .limit(1);

    const guest = guestResult[0];

    if (!guest) {
      return NextResponse.json(
        { error: "Invalid OR unrecognized QR Code" },
        { status: 404 }
      );
    }

    if (guest.is_checked_in) {
      return NextResponse.json(
        { error: "Guest is already checked in!" },
        { status: 400 } // Or 409 Conflict
      );
    }

    // Update guest to checked in
    await db
      .update(guests)
      .set({
        is_checked_in: true,
        checked_in_at: new Date(),
      })
      .where(eq(guests.id, guest.id));

    return NextResponse.json({
      success: true,
      name: guest.name,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
