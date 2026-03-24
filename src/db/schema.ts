import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const guests = sqliteTable("guests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  qr_code_id: text("qr_code_id").notNull().unique(),
  is_checked_in: integer("is_checked_in", { mode: 'boolean' }).default(false).notNull(),
  checked_in_at: integer("checked_in_at", { mode: 'timestamp' }),
  email_sent: integer("email_sent", { mode: 'boolean' }).default(false).notNull(),
});
