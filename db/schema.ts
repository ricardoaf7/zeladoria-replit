import { pgTable, serial, text, integer, jsonb, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";

export const serviceAreas = pgTable("service_areas", {
  id: serial("id").primaryKey(),
  ordem: integer("ordem"),
  tipo: text("tipo").notNull(),
  endereco: text("endereco").notNull(),
  bairro: text("bairro"),
  metragem_m2: doublePrecision("metragem_m2"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  lote: integer("lote"),
  status: text("status").notNull().default("Pendente"),
  history: jsonb("history").notNull().default([]),
  polygon: jsonb("polygon"),
  scheduledDate: text("scheduled_date"),
  proximaPrevisao: text("proxima_previsao"),
  manualSchedule: boolean("manual_schedule").default(false),
  daysToComplete: integer("days_to_complete"),
  servico: text("servico"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  service: text("service").notNull(),
  type: text("type").notNull(),
  lote: integer("lote"),
  status: text("status").notNull().default("Idle"),
  currentAreaId: integer("current_area_id"),
  location: jsonb("location").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appConfig = pgTable("app_config", {
  id: serial("id").primaryKey(),
  mowingProductionRate: jsonb("mowing_production_rate").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
