import { pgTable, text, serial, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const staffUsersTable = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  tgId: bigint("tg_id", { mode: "number" }).notNull().unique(),
  role: text("role").notNull(),
  regionId: text("region_id"),
  username: text("username"),
  lang: text("lang").notNull().default("uz"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStaffUserSchema = createInsertSchema(staffUsersTable).omit({ id: true, createdAt: true });
export type InsertStaffUser = z.infer<typeof insertStaffUserSchema>;
export type StaffUser = typeof staffUsersTable.$inferSelect;
