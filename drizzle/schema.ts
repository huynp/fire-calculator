import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * FIRE scenarios table - stores user's financial independence calculations
 */
export const fireScenarios = mysqlTable("fire_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Input parameters
  currentBalance: decimal("currentBalance", { precision: 15, scale: 2 }).notNull(),
  annualReturn: decimal("annualReturn", { precision: 5, scale: 2 }).notNull(), // e.g., 7.00 for 7%
  monthlyContribution: decimal("monthlyContribution", { precision: 15, scale: 2 }).notNull(),
  monthlyExpense: decimal("monthlyExpense", { precision: 15, scale: 2 }).notNull(),
  currentAge: int("currentAge").notNull(),
  retirementAge: int("retirementAge").notNull(),
  inflationRate: decimal("inflationRate", { precision: 5, scale: 2 }).notNull(), // e.g., 3.00 for 3%
  safeWithdrawalRate: decimal("safeWithdrawalRate", { precision: 5, scale: 2 }).notNull(), // e.g., 4.00 for 4%
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FireScenario = typeof fireScenarios.$inferSelect;
export type InsertFireScenario = typeof fireScenarios.$inferInsert;