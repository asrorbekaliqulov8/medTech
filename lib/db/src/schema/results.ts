import { pgTable, text, serial, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(),
  fileUrl: text("file_url"),
  fileId: text("file_id"),
  notes: text("notes"),
  doctorId: bigint("doctor_id", { mode: "number" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).notNull(),
  orderId: text("order_id"),
  rating: text("rating"),
  type: text("type"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true, createdAt: true });
export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof resultsTable.$inferSelect;
