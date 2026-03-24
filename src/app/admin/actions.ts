"use server";

import { db } from "@/db";
import { guests } from "@/db/schema";
import { eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getGuests(searchQuery = "", page = 1, pageSize = 20) {
  try {
    let query = db.select().from(guests);
    
    // SQLite doesn't strictly need casting but TS might complain about 'query' object methods depending on drizzle signature changes. Note the 'as any' pattern.
    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`;
      query = query.where(
        or(
          like(guests.name, searchPattern),
          like(guests.email, searchPattern)
        )
      ) as any;
    }

    const allGuests = await query.all();
    
    // Sort by name A-Z
    allGuests.sort((a, b) => a.name.localeCompare(b.name));

    const total = allGuests.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedGuests = allGuests.slice(startIndex, startIndex + pageSize);

    return { 
      guests: paginatedGuests, 
      total,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error("Failed to fetch guests:", error);
    return { guests: [], total: 0, totalPages: 0 };
  }
}

export async function toggleCheckIn(guestId: number, currentStatus: boolean) {
  try {
    await db.update(guests)
      .set({
        is_checked_in: !currentStatus,
        checked_in_at: !currentStatus ? new Date() : null,
      })
      .where(eq(guests.id, guestId));
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle check-in:", error);
    return { success: false, error: "Failed to update check-in status." };
  }
}

export async function updateGuest(guestId: number, name: string, email: string) {
  try {
    await db.update(guests)
      .set({ name, email })
      .where(eq(guests.id, guestId));
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update guest:", error);
    return { success: false, error: "Failed to update guest details." };
  }
}
