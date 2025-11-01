import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, inArray } from "drizzle-orm";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import type { ServiceArea, Team, AppConfig } from "@shared/schema";
import { serviceAreas, teams, appConfig } from "../db/schema";
import type { IStorage } from "./storage";

neonConfig.webSocketConstructor = ws;

export class DbStorage implements IStorage {
  private db;
  private pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool);
  }

  async getAllAreas(serviceType: string): Promise<ServiceArea[]> {
    const results = await this.db
      .select()
      .from(serviceAreas)
      .where(eq(serviceAreas.servico, serviceType));
    
    return results.map(this.mapDbAreaToServiceArea);
  }

  async getAreaById(id: number): Promise<ServiceArea | undefined> {
    const results = await this.db
      .select()
      .from(serviceAreas)
      .where(eq(serviceAreas.id, id))
      .limit(1);
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async updateAreaStatus(id: number, status: string): Promise<ServiceArea | undefined> {
    const results = await this.db
      .update(serviceAreas)
      .set({ status, updatedAt: new Date() })
      .where(eq(serviceAreas.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async updateAreaSchedule(id: number, scheduledDate: string): Promise<ServiceArea | undefined> {
    const results = await this.db
      .update(serviceAreas)
      .set({ scheduledDate, updatedAt: new Date() })
      .where(eq(serviceAreas.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async updateAreaPolygon(id: number, polygon: Array<{ lat: number; lng: number }>): Promise<ServiceArea | undefined> {
    const results = await this.db
      .update(serviceAreas)
      .set({ polygon: polygon as any, updatedAt: new Date() })
      .where(eq(serviceAreas.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async updateAreaPosition(id: number, lat: number, lng: number): Promise<ServiceArea | undefined> {
    const results = await this.db
      .update(serviceAreas)
      .set({ lat, lng, updatedAt: new Date() })
      .where(eq(serviceAreas.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async updateArea(id: number, data: Partial<ServiceArea>): Promise<ServiceArea | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    if (data.polygon !== undefined) {
      updateData.polygon = data.polygon;
    }
    if (data.history !== undefined) {
      updateData.history = data.history;
    }
    
    const results = await this.db
      .update(serviceAreas)
      .set(updateData)
      .where(eq(serviceAreas.id, id))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async addHistoryEntry(
    areaId: number, 
    entry: { date: string; status: string; observation?: string }
  ): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(areaId);
    if (!area) return undefined;

    const updatedHistory = [...area.history, entry];
    
    const results = await this.db
      .update(serviceAreas)
      .set({ history: updatedHistory as any, updatedAt: new Date() })
      .where(eq(serviceAreas.id, areaId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbAreaToServiceArea(results[0]);
  }

  async batchScheduleAreas(
    areaIds: number[], 
    scheduledDate: string, 
    daysToComplete?: number
  ): Promise<ServiceArea[]> {
    const results = await this.db
      .update(serviceAreas)
      .set({ 
        scheduledDate, 
        daysToComplete,
        manualSchedule: true,
        updatedAt: new Date()
      })
      .where(inArray(serviceAreas.id, areaIds))
      .returning();
    
    return results.map(this.mapDbAreaToServiceArea);
  }

  async getAllTeams(): Promise<Team[]> {
    const results = await this.db.select().from(teams);
    return results.map(this.mapDbTeamToTeam);
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    const results = await this.db
      .select()
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);
    
    if (results.length === 0) return undefined;
    return this.mapDbTeamToTeam(results[0]);
  }

  async assignTeamToArea(teamId: number, areaId: number): Promise<Team | undefined> {
    const results = await this.db
      .update(teams)
      .set({ 
        currentAreaId: areaId, 
        status: "Assigned",
        updatedAt: new Date()
      })
      .where(eq(teams.id, teamId))
      .returning();
    
    if (results.length === 0) return undefined;
    return this.mapDbTeamToTeam(results[0]);
  }

  async getConfig(): Promise<AppConfig> {
    const results = await this.db.select().from(appConfig).limit(1);
    
    if (results.length === 0) {
      const defaultConfig = {
        mowingProductionRate: {
          lote1: 25000,
          lote2: 20000,
        },
      };
      
      const created = await this.db
        .insert(appConfig)
        .values({ mowingProductionRate: defaultConfig.mowingProductionRate as any })
        .returning();
      
      return defaultConfig;
    }
    
    return {
      mowingProductionRate: results[0].mowingProductionRate as { lote1: number; lote2: number }
    };
  }

  async updateConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    const current = await this.getConfig();
    const updated = {
      mowingProductionRate: {
        ...current.mowingProductionRate,
        ...(config.mowingProductionRate || {})
      }
    };
    
    await this.db
      .update(appConfig)
      .set({ 
        mowingProductionRate: updated.mowingProductionRate as any,
        updatedAt: new Date()
      });
    
    return updated;
  }

  private mapDbAreaToServiceArea(dbArea: any): ServiceArea {
    return {
      id: dbArea.id,
      ordem: dbArea.ordem,
      tipo: dbArea.tipo,
      endereco: dbArea.endereco,
      bairro: dbArea.bairro,
      metragem_m2: dbArea.metragem_m2,
      lat: dbArea.lat,
      lng: dbArea.lng,
      lote: dbArea.lote,
      status: dbArea.status as "Pendente" | "Em Execução" | "Concluído",
      history: (dbArea.history as any) || [],
      polygon: dbArea.polygon as any,
      scheduledDate: dbArea.scheduledDate,
      proximaPrevisao: dbArea.proximaPrevisao,
      ultimaRocagem: dbArea.ultimaRocagem,
      manualSchedule: dbArea.manualSchedule ?? false,
      daysToComplete: dbArea.daysToComplete,
      servico: dbArea.servico,
    };
  }

  private mapDbTeamToTeam(dbTeam: any): Team {
    return {
      id: dbTeam.id,
      service: dbTeam.service,
      type: dbTeam.type,
      lote: dbTeam.lote,
      status: dbTeam.status as "Idle" | "Assigned" | "Working",
      currentAreaId: dbTeam.currentAreaId,
      location: dbTeam.location as { lat: number; lng: number },
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
