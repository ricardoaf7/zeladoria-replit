import { z } from "zod";

// Service Area Schema
export const serviceAreaSchema = z.object({
  id: z.number(),
  ordem: z.number().optional(),
  tipo: z.string(),
  endereco: z.string(),
  bairro: z.string().optional(),
  metragem_m2: z.number().optional(),
  lat: z.number(),
  lng: z.number(),
  lote: z.number().optional(),
  status: z.enum(["Pendente", "Em Execução", "Concluído"]).default("Pendente"),
  history: z.array(z.object({
    date: z.string(),
    status: z.string(),
    observation: z.string().optional(),
  })).default([]),
  polygon: z.array(z.object({
    lat: z.number(),
    lng: z.number(),
  })).nullable().default(null),
  scheduledDate: z.string().nullable().default(null),
  proximaPrevisao: z.string().nullable().optional(),
  ultimaRocagem: z.string().nullable().optional(),
  manualSchedule: z.boolean().optional().default(false),
  daysToComplete: z.number().optional(),
  servico: z.string().optional(),
});

export type ServiceArea = z.infer<typeof serviceAreaSchema>;

export const insertServiceAreaSchema = serviceAreaSchema.omit({
  id: true,
  history: true,
  scheduledDate: true,
});

export type InsertServiceArea = z.infer<typeof insertServiceAreaSchema>;

// Team Schema
export const teamSchema = z.object({
  id: z.number(),
  service: z.string(),
  type: z.string(),
  lote: z.number().nullable(),
  status: z.enum(["Idle", "Assigned", "Working"]).default("Idle"),
  currentAreaId: z.number().nullable().default(null),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export type Team = z.infer<typeof teamSchema>;

export const insertTeamSchema = teamSchema.omit({
  id: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;

// App Configuration Schema
export const appConfigSchema = z.object({
  mowingProductionRate: z.object({
    lote1: z.number(),
    lote2: z.number(),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export const updateAppConfigSchema = appConfigSchema.partial();

export type UpdateAppConfig = z.infer<typeof updateAppConfigSchema>;
