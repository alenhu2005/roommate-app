import { pgTable, text, real, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const records = pgTable("records", {
  id: varchar("id").primaryKey(),
  date: text("date").notNull(),
  item: text("item").notNull(),
  amount: real("amount").notNull(),
  paidBy: text("paid_by").notNull(),
  splitMode: text("split_mode").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecordSchema = createInsertSchema(records).omit({
  createdAt: true,
});

export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type Record = typeof records.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
