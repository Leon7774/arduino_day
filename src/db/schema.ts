import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  qr_code_id: text("qr_code_id").notNull().unique(),
  is_checked_in: boolean("is_checked_in").default(false).notNull(),
  checked_in_at: timestamp("checked_in_at"),
  email_sent: boolean("email_sent").default(false).notNull(),
});
