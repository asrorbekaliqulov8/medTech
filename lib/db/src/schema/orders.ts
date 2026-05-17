import { pgTable, text, serial, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
  telegramUserId: integer("telegram_user_id").notNull(),
  telegramUsername: text("telegram_username"),
  lang: text("lang").notNull().default("uz"),
  patientName: text("patient_name").notNull(),
  patientAge: integer("patient_age").notNull(),
  patientGender: text("patient_gender").notNull(),
  patientType: text("patient_type").notNull(),
  serviceId: text("service_id").notNull(),
  childTiming: text("child_timing"),
  usesDiaper: boolean("uses_diaper"),
  complaints: text("complaints").notNull().default("[]"),
  customComplaint: text("custom_complaint"),
  deliverySlot: text("delivery_slot").notNull(),
  pickupSlot: text("pickup_slot"),
  districtId: text("district_id").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  addressNote: text("address_note"),
  price: integer("price").notNull().default(0),
  extraPrice: integer("extra_price").notNull().default(0),
  isFree: boolean("is_free").notNull().default(false),
  status: text("status").notNull().default("pending_payment"),
  receiptFileId: text("receipt_file_id"),
  resultFileId: text("result_file_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
