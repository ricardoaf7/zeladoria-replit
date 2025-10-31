import type { ServiceArea, Team, AppConfig } from "@shared/schema";

export interface IStorage {
  // Service Areas
  getAllAreas(serviceType: string): Promise<ServiceArea[]>;
  getAreaById(id: number): Promise<ServiceArea | undefined>;
  updateAreaStatus(id: number, status: string): Promise<ServiceArea | undefined>;
  updateAreaSchedule(id: number, scheduledDate: string): Promise<ServiceArea | undefined>;
  updateAreaPolygon(id: number, polygon: Array<{ lat: number; lng: number }>): Promise<ServiceArea | undefined>;
  updateAreaPosition(id: number, lat: number, lng: number): Promise<ServiceArea | undefined>;
  updateArea(id: number, data: Partial<ServiceArea>): Promise<ServiceArea | undefined>;
  addHistoryEntry(areaId: number, entry: { date: string; status: string; observation?: string }): Promise<ServiceArea | undefined>;
  batchScheduleAreas(areaIds: number[], scheduledDate: string, daysToComplete?: number): Promise<ServiceArea[]>;
  
  // Teams
  getAllTeams(): Promise<Team[]>;
  getTeamById(id: number): Promise<Team | undefined>;
  assignTeamToArea(teamId: number, areaId: number): Promise<Team | undefined>;
  
  // Configuration
  getConfig(): Promise<AppConfig>;
  updateConfig(config: Partial<AppConfig>): Promise<AppConfig>;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
}

function calculateMowingSchedule(areas: ServiceArea[], config: AppConfig): void {
  let currentDateLote1 = new Date();
  let currentDateLote2 = new Date();

  // Pular áreas com agendamento manual (manualSchedule === true)
  const lote1Areas = areas
    .filter(a => a.lote === 1 && a.status === "Pendente" && !a.manualSchedule)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const lote2Areas = areas
    .filter(a => a.lote === 2 && a.status === "Pendente" && !a.manualSchedule)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  lote1Areas.forEach(area => {
    area.scheduledDate = currentDateLote1.toISOString();
    if (area.metragem_m2) {
      const daysToComplete = Math.ceil(area.metragem_m2 / config.mowingProductionRate.lote1);
      currentDateLote1 = addBusinessDays(currentDateLote1, daysToComplete);
    } else {
      currentDateLote1 = addBusinessDays(currentDateLote1, 1);
    }
  });

  lote2Areas.forEach(area => {
    area.scheduledDate = currentDateLote2.toISOString();
    if (area.metragem_m2) {
      const daysToComplete = Math.ceil(area.metragem_m2 / config.mowingProductionRate.lote2);
      currentDateLote2 = addBusinessDays(currentDateLote2, daysToComplete);
    } else {
      currentDateLote2 = addBusinessDays(currentDateLote2, 1);
    }
  });
}

export class MemStorage implements IStorage {
  private rocagemAreas: ServiceArea[];
  private jardinsAreas: ServiceArea[];
  private teams: Team[];
  private config: AppConfig;

  constructor() {
    this.config = {
      mowingProductionRate: {
        lote1: 25000,
        lote2: 20000,
      },
    };

    this.rocagemAreas = this.initializeRocagemAreas();
    this.jardinsAreas = this.initializeJardinsAreas();
    this.teams = this.initializeTeams();

    calculateMowingSchedule(this.rocagemAreas, this.config);
  }

  private initializeRocagemAreas(): ServiceArea[] {
    const sampleAreas: ServiceArea[] = [
      { id: 1, ordem: 1, tipo: "area publica", endereco: "Av Jorge Casoni - Terminal Rodoviário", bairro: "Casoni", metragem_m2: 29184.98, lat: -23.3044206, lng: -51.1513729, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 2, ordem: 2, tipo: "praça", endereco: "Rua Carijós c/ Oraruana", bairro: "Paraná", metragem_m2: 2332.83, lat: -23.3045262, lng: -51.1480067, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 3, ordem: 3, tipo: "area publica", endereco: "Av Saul Elkind", bairro: "Lago Parque", metragem_m2: 15234.56, lat: -23.2987, lng: -51.1623, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 4, ordem: 4, tipo: "canteiro", endereco: "Av Madre Leônia Milito", bairro: "Centro", metragem_m2: 8765.43, lat: -23.3101, lng: -51.1628, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 5, ordem: 5, tipo: "area publica", endereco: "Praça Sete de Setembro", bairro: "Centro", metragem_m2: 12456.78, lat: -23.3099, lng: -51.1603, lote: 1, status: "Em Execução", history: [{ date: new Date().toISOString(), status: "Iniciado", observation: "Equipe 1 iniciou trabalho" }], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 6, ordem: 6, tipo: "praça", endereco: "Praça Rocha Pombo", bairro: "Vila Nova", metragem_m2: 9876.54, lat: -23.3142, lng: -51.1578, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 7, ordem: 7, tipo: "area publica", endereco: "Av Bandeirantes", bairro: "Bandeirantes", metragem_m2: 18765.43, lat: -23.2876, lng: -51.1456, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 8, ordem: 8, tipo: "canteiro", endereco: "Av Ayrton Senna", bairro: "Gleba Palhano", metragem_m2: 21234.56, lat: -23.2834, lng: -51.1823, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 9, ordem: 9, tipo: "area publica", endereco: "Parque Arthur Thomas", bairro: "Nova Londrina", metragem_m2: 45678.90, lat: -23.3167, lng: -51.1789, lote: 1, status: "Concluído", history: [{ date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), status: "Concluído" }], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 10, ordem: 10, tipo: "praça", endereco: "Praça Willie Davids", bairro: "Heimtal", metragem_m2: 7654.32, lat: -23.3234, lng: -51.1423, lote: 1, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      
      { id: 101, ordem: 1, tipo: "area publica", endereco: "Av Duque de Caxias", bairro: "Zona Sul", metragem_m2: 32145.67, lat: -23.3367, lng: -51.1534, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 102, ordem: 2, tipo: "canteiro", endereco: "Av Inglaterra", bairro: "Cinco Conjuntos", metragem_m2: 11234.56, lat: -23.3278, lng: -51.1745, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 103, ordem: 3, tipo: "praça", endereco: "Praça Maringá", bairro: "Cervejaria", metragem_m2: 8765.43, lat: -23.3189, lng: -51.1667, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 104, ordem: 4, tipo: "area publica", endereco: "Av JK", bairro: "Tucanos", metragem_m2: 19876.54, lat: -23.3445, lng: -51.1623, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 105, ordem: 5, tipo: "canteiro", endereco: "Av Higienópolis", bairro: "Higienópolis", metragem_m2: 14567.89, lat: -23.3123, lng: -51.1489, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 106, ordem: 6, tipo: "area publica", endereco: "Parque Guanabara", bairro: "Guanabara", metragem_m2: 28765.43, lat: -23.2989, lng: -51.1823, lote: 2, status: "Em Execução", history: [{ date: new Date().toISOString(), status: "Iniciado" }], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 107, ordem: 7, tipo: "praça", endereco: "Praça Santos Dumont", bairro: "Aeroporto", metragem_m2: 9876.54, lat: -23.3034, lng: -51.1378, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 108, ordem: 8, tipo: "area publica", endereco: "Av Tiradentes", bairro: "Centro", metragem_m2: 16543.21, lat: -23.3087, lng: -51.1645, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 109, ordem: 9, tipo: "canteiro", endereco: "Av Dez de Dezembro", bairro: "Centro", metragem_m2: 12345.67, lat: -23.3112, lng: -51.1590, lote: 2, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 110, ordem: 10, tipo: "praça", endereco: "Praça Primeiro de Maio", bairro: "Ouro Branco", metragem_m2: 8901.23, lat: -23.3267, lng: -51.1501, lote: 2, status: "Concluído", history: [{ date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: "Concluído" }], polygon: null, scheduledDate: null, manualSchedule: false },
    ];

    const tipos = ["area publica", "praça", "canteiro", "rotatória"];
    const bairros = ["Centro", "Zona Sul", "Gleba Palhano", "Higienópolis", "Casoni", "Bandeirantes", "Vila Nova", "Tucanos", "Heimtal", "Aeroporto"];
    const ruas = ["Av", "Rua", "Praça", "Travessa"];
    const nomes = ["das Flores", "Santos Dumont", "Brasil", "Pioneiros", "Industrial", "Comercial", "Residencial", "Jardim", "Parque", "Vila"];

    let idCounter = 200;
    for (let i = 0; i < 100; i++) {
      const lote = Math.random() > 0.5 ? 1 : 2;
      const area: ServiceArea = {
        id: idCounter++,
        ordem: i + 11,
        tipo: tipos[Math.floor(Math.random() * tipos.length)],
        endereco: `${ruas[Math.floor(Math.random() * ruas.length)]} ${nomes[Math.floor(Math.random() * nomes.length)]} ${i + 1}`,
        bairro: bairros[Math.floor(Math.random() * bairros.length)],
        metragem_m2: Math.floor(Math.random() * 40000) + 5000,
        lat: -23.31 + (Math.random() - 0.5) * 0.1,
        lng: -51.16 + (Math.random() - 0.5) * 0.1,
        lote,
        status: "Pendente",
        history: [],
        polygon: null,
        scheduledDate: null,
        manualSchedule: false,
      };
      sampleAreas.push(area);
    }

    return sampleAreas;
  }

  private initializeJardinsAreas(): ServiceArea[] {
    return [
      { id: 1001, tipo: "ROT", endereco: "Av. Henrique Mansano x Av. Lucia Helena Gonçalves Vianna (Sanepar)", servico: "Manutenção", lat: -23.282252, lng: -51.155120, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 1002, tipo: "ROT", endereco: "Av. Maringá x Rua Prof. Joaquim de Matos Barreto (Aterro Maior)", servico: "Irrigação", lat: -23.324934, lng: -51.176449, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 1003, tipo: "ROT", endereco: "Praça Rocha Pombo", servico: "Manutenção", lat: -23.314200, lng: -51.157800, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 1004, tipo: "ROT", endereco: "Parque Arthur Thomas", servico: "Irrigação", lat: -23.316700, lng: -51.178900, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
      { id: 1005, tipo: "ROT", endereco: "Jardim Botânico", servico: "Manutenção", lat: -23.328900, lng: -51.156700, status: "Pendente", history: [], polygon: null, scheduledDate: null, manualSchedule: false },
    ];
  }

  private initializeTeams(): Team[] {
    return [
      { id: 1, service: "rocagem", type: "Giro Zero", lote: 1, status: "Working", currentAreaId: 5, location: { lat: -23.3099, lng: -51.1603 } },
      { id: 2, service: "rocagem", type: "Acabamento", lote: 1, status: "Idle", currentAreaId: null, location: { lat: -23.30, lng: -51.15 } },
      { id: 3, service: "rocagem", type: "Coleta", lote: 1, status: "Idle", currentAreaId: null, location: { lat: -23.30, lng: -51.15 } },
      { id: 4, service: "rocagem", type: "Touceiras", lote: 1, status: "Idle", currentAreaId: null, location: { lat: -23.30, lng: -51.15 } },
      { id: 5, service: "rocagem", type: "Giro Zero", lote: 2, status: "Working", currentAreaId: 106, location: { lat: -23.2989, lng: -51.1823 } },
      { id: 6, service: "rocagem", type: "Acabamento", lote: 2, status: "Idle", currentAreaId: null, location: { lat: -23.31, lng: -51.16 } },
      { id: 7, service: "jardins", type: "Manutenção", lote: null, status: "Idle", currentAreaId: null, location: { lat: -23.32, lng: -51.17 } },
      { id: 8, service: "jardins", type: "Irrigação", lote: null, status: "Idle", currentAreaId: null, location: { lat: -23.32, lng: -51.17 } },
    ];
  }

  async getAllAreas(serviceType: string): Promise<ServiceArea[]> {
    if (serviceType === "rocagem") {
      return this.rocagemAreas;
    } else if (serviceType === "jardins") {
      return this.jardinsAreas;
    }
    return [];
  }

  async getAreaById(id: number): Promise<ServiceArea | undefined> {
    return [...this.rocagemAreas, ...this.jardinsAreas].find(a => a.id === id);
  }

  async updateAreaStatus(id: number, status: string): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(id);
    if (!area) return undefined;

    area.status = status as any;
    area.history.push({
      date: new Date().toISOString(),
      status: status,
    });

    if (status === "Concluído" && area.lote) {
      calculateMowingSchedule(this.rocagemAreas, this.config);
    }

    return area;
  }

  async updateAreaSchedule(id: number, scheduledDate: string): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(id);
    if (!area) return undefined;

    area.scheduledDate = scheduledDate;
    return area;
  }

  async updateAreaPolygon(id: number, polygon: Array<{ lat: number; lng: number }>): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(id);
    if (!area) return undefined;

    area.polygon = polygon;
    return area;
  }

  async updateAreaPosition(id: number, lat: number, lng: number): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(id);
    if (!area) return undefined;

    area.lat = lat;
    area.lng = lng;
    return area;
  }

  async updateArea(id: number, data: Partial<ServiceArea>): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(id);
    if (!area) return undefined;

    Object.assign(area, data);
    return area;
  }

  async addHistoryEntry(areaId: number, entry: { date: string; status: string; observation?: string }): Promise<ServiceArea | undefined> {
    const area = await this.getAreaById(areaId);
    if (!area) return undefined;

    area.history.push(entry);
    return area;
  }

  async batchScheduleAreas(areaIds: number[], scheduledDate: string, daysToComplete?: number): Promise<ServiceArea[]> {
    const updatedAreas: ServiceArea[] = [];

    for (const areaId of areaIds) {
      const area = await this.getAreaById(areaId);
      if (!area) continue;

      area.scheduledDate = scheduledDate;
      area.manualSchedule = true;
      if (daysToComplete !== undefined) {
        area.daysToComplete = daysToComplete;
      }

      updatedAreas.push(area);
    }

    return updatedAreas;
  }

  async getAllTeams(): Promise<Team[]> {
    return this.teams;
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    return this.teams.find(t => t.id === id);
  }

  async assignTeamToArea(teamId: number, areaId: number): Promise<Team | undefined> {
    const team = await this.getTeamById(teamId);
    if (!team) return undefined;

    team.currentAreaId = areaId;
    team.status = "Assigned";

    return team;
  }

  async getConfig(): Promise<AppConfig> {
    return this.config;
  }

  async updateConfig(newConfig: Partial<AppConfig>): Promise<AppConfig> {
    if (newConfig.mowingProductionRate) {
      this.config.mowingProductionRate = {
        ...this.config.mowingProductionRate,
        ...newConfig.mowingProductionRate,
      };
      calculateMowingSchedule(this.rocagemAreas, this.config);
    }
    return this.config;
  }
}

export const storage = new MemStorage();
