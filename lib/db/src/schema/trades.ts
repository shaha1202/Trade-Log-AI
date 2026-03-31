import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const directionEnum = pgEnum("direction", ["long", "short"]);
export const resultEnum = pgEnum("result_type", ["win", "loss", "breakeven"]);

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  asset: text("asset").notNull(),
  timeframe: text("timeframe").notNull(),
  session: text("session"),
  direction: directionEnum("direction").notNull(),
  entry: numeric("entry", { precision: 18, scale: 6 }),
  stopLoss: numeric("stop_loss", { precision: 18, scale: 6 }),
  takeProfit: numeric("take_profit", { precision: 18, scale: 6 }),
  rr: numeric("rr", { precision: 10, scale: 4 }),
  lotSize: numeric("lot_size", { precision: 12, scale: 4 }),
  riskPct: numeric("risk_pct", { precision: 8, scale: 4 }),
  pnl: numeric("pnl", { precision: 18, scale: 4 }),
  holdDuration: text("hold_duration"),
  result: resultEnum("result"),
  htfTrend: text("htf_trend"),
  confluences: text("confluences").array().notNull().default([]),
  aiNarrative: text("ai_narrative"),
  checklistDirectionAligned: boolean("checklist_direction_aligned"),
  checklistMinConfluences: boolean("checklist_min_confluences"),
  checklistRr: boolean("checklist_rr"),
  checklistRisk: boolean("checklist_risk"),
  checklistSlStructure: boolean("checklist_sl_structure"),
  checklistCalendar: boolean("checklist_calendar"),
  moodTags: text("mood_tags").array().notNull().default([]),
  planAdherence: integer("plan_adherence"),
  didWell: text("did_well"),
  toImprove: text("to_improve"),
  screenshotUrl: text("screenshot_url"),
  aiAnalyzed: boolean("ai_analyzed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
