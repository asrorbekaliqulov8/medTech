import { pgTable, serial, bigint, integer, text, timestamp } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userTgId: bigint("user_tg_id", { mode: "number" }),
  rating: integer("rating"),
  problemType: text("problem_type"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Feedback = typeof feedbackTable.$inferSelect;
