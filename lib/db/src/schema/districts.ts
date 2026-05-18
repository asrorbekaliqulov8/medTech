import { pgTable, text, real, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const districtsTable = pgTable("districts", {
  id: text("id").primaryKey(),
  nameUz: text("name_uz").notNull(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  available: boolean("available").notNull().default(false),
  courierExtraFee: integer("courier_extra_fee").notNull().default(0),
  geojson: text("geojson"),
  osmRelationId: text("osm_relation_id"),
});

export const insertDistrictSchema = createInsertSchema(districtsTable);
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districtsTable.$inferSelect;
