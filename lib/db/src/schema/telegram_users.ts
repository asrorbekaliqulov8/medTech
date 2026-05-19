import { pgTable, text, serial, bigint, integer, timestamp } from "drizzle-orm/pg-core";

export const telegramUsersTable = pgTable("telegram_users", {
  id: serial("id").primaryKey(),
  tgId: bigint("tg_id", { mode: "number" }).notNull().unique(),
  lang: text("lang").notNull().default("uz"),
  patientId: text("patient_id").unique(),
  fullName: text("full_name"),
  orderCount: integer("order_count").notNull().default(0),
  bonusPoints: integer("bonus_points").notNull().default(0),
  role: text("role").notNull().default("user"),
  regionId: text("region_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TelegramUser = typeof telegramUsersTable.$inferSelect;
