import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import type { ServiceArea } from "@shared/schema";
import { randomUUID } from "crypto";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Função para converter ServiceArea[] para CSV compatível com Supabase
function convertToSupabaseCSV(areas: ServiceArea[]): string {
  if (areas.length === 0) {
    return 'id,ordem,sequencia_cadastro,tipo,endereco,bairro,metragem_m2,lat,lng,lote,status,history,polygon,scheduled_date,proxima_previsao,ultima_rocagem,manual_schedule,days_to_complete,servico,registrado_por,data_registro,executando,executando_desde\n';
  }

  // Headers com nomes de colunas do PostgreSQL
  const headers = [
    'id', 'ordem', 'sequencia_cadastro', 'tipo', 'endereco', 'bairro', 
    'metragem_m2', 'lat', 'lng', 'lote', 'status', 'history', 'polygon',
    'scheduled_date', 'proxima_previsao', 'ultima_rocagem', 'manual_schedule',
    'days_to_complete', 'servico', 'registrado_por', 'data_registro',
    'executando', 'executando_desde'
  ];

  // Função para escapar valores CSV
  function escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    // Converter arrays/objetos JSONB para formato Supabase
    if (typeof value === 'object') {
      // Usar JSON.stringify e escapar aspas duplas
      const jsonStr = JSON.stringify(value);
      // Escapar aspas duplas dobrando-as e envolver em aspas
      return `"${jsonStr.replace(/"/g, '""')}"`;
    }

    // Converter boolean para string lowercase
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    // Converter números
    if (typeof value === 'number') {
      return String(value);
    }

    // Strings: escapar aspas e vírgulas
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  // Construir CSV
  let csv = headers.join(',') + '\n';

  for (const area of areas) {
    const row = [
      area.id,
      area.ordem ?? '',
      area.sequenciaCadastro ?? '',
      area.tipo ?? '',
      area.endereco ?? '',
      area.bairro ?? '',
      area.metragem_m2 ?? '',
      area.lat ?? '',
      area.lng ?? '',
      area.lote ?? '',
      area.status ?? '',
      area.history ?? [],
      area.polygon ?? null,
      area.scheduledDate ?? '',
      area.proximaPrevisao ?? '',
      area.ultimaRocagem ?? '',
      area.manualSchedule ?? false,
      area.daysToComplete ?? '',
      area.servico ?? '',
      area.registradoPor ?? '',
      area.dataRegistro ?? '',
      area.executando ?? false,
      area.executandoDesde ?? '',
    ];

    csv += row.map(escapeCSVValue).join(',') + '\n';
  }

  return csv;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Endpoint para deletar área
  app.delete("/api/areas/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const deleted = await storage.deleteArea(id);
      if (!deleted) {
        return res.status(404).json({ error: "Área não encontrada" });
      }

      res.json({ success: true, message: "Área deletada com sucesso" });
    } catch (error) {
      console.error("Delete area error:", error);
      res.status(500).json({ error: "Falha ao deletar área" });
    }
  });

  // Endpoint para upload de fotos
  app.post("/api/photo/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      if (!validExts.includes(ext)) {
        return res.status(400).json({ error: "Tipo de arquivo não permitido" });
      }

      const filename = `${randomUUID()}${ext}`;
      const filepath = path.join(uploadDir, filename);
      
      fs.writeFileSync(filepath, req.file.buffer);
      
      res.json({ url: `/uploads/${filename}` });
    } catch (error) {
      console.error("Photo upload error:", error);
      res.status(500).json({ error: "Falha ao fazer upload" });
    }
  });

  // Endpoint de backup: exportar todos os dados em JSON
  app.get("/api/backup", async (req, res) => {
    try {
      const allAreas = await storage.getAllAreas("rocagem");
      const config = await storage.getConfig();
      
      const backup = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        data: {
          areas: allAreas,
          config: config,
        },
        stats: {
          totalAreas: allAreas.length,
          areasWithMowing: allAreas.filter(a => a.ultimaRocagem).length,
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=zeladoria_backup_${new Date().toISOString().split('T')[0]}.json`);
      res.json(backup);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Falha ao gerar backup" });
    }
  });

  app.get("/api/admin/download-csv", async (req, res) => {
    try {
      const csvPath = path.join(process.cwd(), "server", "data", "areas_londrina.csv");
      
      if (!fs.existsSync(csvPath)) {
        res.status(404).json({ error: "Arquivo CSV não encontrado no servidor" });
        return;
      }
      
      res.download(csvPath, "areas_londrina.csv");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      res.status(500).json({ error: "Falha ao baixar arquivo CSV" });
    }
  });

  // Endpoint de exportação CSV para Supabase
  app.get("/api/export/csv", async (req, res) => {
    try {
      const startTime = Date.now();
      const mode = (req.query.mode as string) || 'full';
      
      if (mode !== 'full' && mode !== 'incremental') {
        res.status(400).json({ error: "Modo inválido. Use 'full' ou 'incremental'" });
        return;
      }

      let areas: any[] = [];
      let wasDefaultedToFull = false;

      if (mode === 'incremental') {
        // Tentar obter último export
        const lastExport = await storage.getLastExport('service_areas', 'full');
        
        if (!lastExport) {
          // Se não há histórico, fazer full export como fallback
          areas = await storage.getAllAreas("rocagem");
          wasDefaultedToFull = true;
        } else {
          // Exportar apenas áreas modificadas desde último export
          const lastExportDate = new Date(lastExport.exportedAt);
          areas = await storage.getAreasModifiedSince(lastExportDate);
        }
      } else {
        // Full export: todas as áreas
        areas = await storage.getAllAreas("rocagem");
      }

      // Converter para CSV com formato Supabase-compatível
      const csv = convertToSupabaseCSV(areas);
      
      // Gravar histórico de exportação
      const duration = Date.now() - startTime;
      await storage.recordExport({
        scope: 'service_areas',
        exportType: wasDefaultedToFull ? 'full' : mode as 'full' | 'incremental',
        recordCount: areas.length,
        durationMs: duration,
      });

      // Definir headers para download
      const filename = `zeladoria_${mode}_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Adicionar metadata na response se foi fallback
      if (wasDefaultedToFull) {
        res.setHeader('X-Export-Info', 'Primeira exportação - modo incremental convertido para full');
      }
      
      res.send(csv);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ error: "Falha ao exportar CSV" });
    }
  });

  app.get("/api/areas/rocagem", async (req, res) => {
    try {
      const areas = await storage.getAllAreas("rocagem");
      res.json(areas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roçagem areas" });
    }
  });

  app.get("/api/areas/jardins", async (req, res) => {
    try {
      const areas = await storage.getAllAreas("jardins");
      res.json(areas);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jardins areas" });
    }
  });

  // Novo endpoint otimizado: dados leves para mapa (com suporte a viewport bounds)
  app.get("/api/areas/light", async (req, res) => {
    try {
      const servico = req.query.servico as string || "rocagem";
      const boundsParam = req.query.bounds as string;
      
      let areas = await storage.getAllAreas(servico);
      
      // Filtrar por bounds se fornecido (viewport do mapa)
      if (boundsParam) {
        try {
          const bounds = JSON.parse(boundsParam);
          // Validar bounds usando Number.isFinite para aceitar valores zero/negativos
          if (Number.isFinite(bounds.north) && Number.isFinite(bounds.south) && 
              Number.isFinite(bounds.east) && Number.isFinite(bounds.west)) {
            areas = areas.filter(area => {
              if (area.lat === null || area.lat === undefined || 
                  area.lng === null || area.lng === undefined) return false;
              return area.lat >= bounds.south && 
                     area.lat <= bounds.north && 
                     area.lng >= bounds.west && 
                     area.lng <= bounds.east;
            });
          }
        } catch (e) {
          console.error("Error parsing bounds:", e);
          res.status(400).json({ error: "Invalid bounds format" });
          return;
        }
      }
      
      // Retornar apenas campos essenciais para o mapa
      const lightAreas = areas.map(area => ({
        id: area.id,
        lat: area.lat,
        lng: area.lng,
        status: area.status,
        proximaPrevisao: area.proximaPrevisao,
        lote: area.lote,
        servico: area.servico,
        endereco: area.endereco,
        bairro: area.bairro,
        ultimaRocagem: area.ultimaRocagem,
        metragem_m2: area.metragem_m2,
        manualSchedule: area.manualSchedule,
        executando: area.executando || false,
      }));
      
      res.json(lightAreas);
    } catch (error) {
      console.error("Error fetching light areas:", error);
      res.status(500).json({ error: "Failed to fetch light areas" });
    }
  });

  // Novo endpoint: busca server-side otimizada
  app.get("/api/areas/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      const servico = req.query.servico as string || "rocagem";
      
      if (!query) {
        res.json([]);
        return;
      }
      
      // Usar método otimizado do storage que filtra direto no banco
      const results = await storage.searchAreas(query, servico, 50);
      
      res.json(results);
    } catch (error) {
      console.error("Error searching areas:", error);
      res.status(500).json({ error: "Failed to search areas" });
    }
  });

  // Retorna IDs de áreas roçadas em um período específico
  app.get("/api/areas/by-period", async (req, res) => {
    try {
      const { from, to } = req.query;
      if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
        return res.status(400).json({ error: "Parâmetros 'from' e 'to' são obrigatórios (YYYY-MM-DD)" });
      }
      
      const allAreas = await storage.getAllAreas('rocagem');
      const fromDate = new Date(from + 'T00:00:00');
      const toDate = new Date(to + 'T23:59:59');
      
      const matchingIds = allAreas
        .filter(area => {
          if (!area.ultimaRocagem) return false;
          const mowDate = new Date(area.ultimaRocagem);
          return mowDate >= fromDate && mowDate <= toDate;
        })
        .map(area => area.id);
      
      res.json({ ids: matchingIds, count: matchingIds.length });
    } catch (error) {
      console.error("Error fetching areas by period:", error);
      res.status(500).json({ error: "Falha ao buscar áreas por período" });
    }
  });

  // Novo endpoint: detalhes completos de uma área específica
  app.get("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const area = await storage.getAreaById(areaId);
      
      if (!area) {
        res.status(404).json({ error: "Area not found" });
        return;
      }
      
      res.json(area);
    } catch (error) {
      console.error("Error fetching area details:", error);
      res.status(500).json({ error: "Failed to fetch area details" });
    }
  });

  // Criar nova área de serviço
  app.post("/api/areas", async (req, res) => {
    try {
      const createSchema = z.object({
        tipo: z.string().min(1, "Tipo é obrigatório"),
        endereco: z.string().min(1, "Endereço é obrigatório"),
        bairro: z.string().optional(),
        metragem_m2: z.number().positive().optional(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        lote: z.number().int().min(1).max(2).optional(),
        servico: z.enum(["rocagem", "jardins"]).default("rocagem"),
        status: z.enum(["Pendente", "Em Execução", "Concluído"]).default("Pendente"),
        ultimaRocagem: z.string().optional(),
      });

      const validatedData = createSchema.parse(req.body);
      
      // Calcular proximaPrevisao se área já foi roçada
      let proximaPrevisao: string | null = null;
      if (validatedData.ultimaRocagem) {
        const { calculateNextMowing } = await import('@shared/schedulingAlgorithm');
        const tempArea = {
          id: 0,
          ultimaRocagem: validatedData.ultimaRocagem,
          manualSchedule: false,
        } as any;
        
        const result = calculateNextMowing(tempArea);
        if (result) {
          proximaPrevisao = result.proximaPrevisao;
        }
      }
      
      const newArea = await storage.createArea({
        tipo: validatedData.tipo,
        endereco: validatedData.endereco,
        bairro: validatedData.bairro,
        metragem_m2: validatedData.metragem_m2,
        lat: validatedData.lat,
        lng: validatedData.lng,
        lote: validatedData.lote,
        servico: validatedData.servico,
        status: validatedData.status,
        ordem: undefined,
        sequenciaCadastro: undefined,
        history: [],
        polygon: null,
        scheduledDate: null,
        proximaPrevisao,
        ultimaRocagem: validatedData.ultimaRocagem || null,
        manualSchedule: false,
        daysToComplete: undefined,
        registradoPor: null,
        dataRegistro: null,
        fotos: [],
      });

      res.status(201).json(newArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors 
        });
        return;
      }
      console.error("Error creating area:", error);
      res.status(500).json({ error: "Falha ao criar área" });
    }
  });

  // Geocoding: buscar endereços em Londrina (Nominatim/OSM)
  app.get("/api/geocode/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      
      if (!query || query.length < 3) {
        res.json([]);
        return;
      }

      // Usar Nominatim (OpenStreetMap) para geocoding
      const encodedQuery = encodeURIComponent(`${query}, Londrina, Paraná, Brasil`);
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodedQuery}&format=json&limit=8&` +
        `countrycodes=br&bounded=1&` +
        `viewbox=-51.22,-23.25,-51.10,-23.38`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'CMTU-LD Zeladoria Dashboard'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const results = await response.json();
      
      // Formatar resultados
      const formatted = results.map((r: any) => ({
        display_name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        type: r.type,
        address: r.address,
        boundingbox: r.boundingbox,
      }));

      res.json(formatted);
    } catch (error) {
      console.error("Error geocoding:", error);
      res.status(500).json({ error: "Falha ao buscar endereço" });
    }
  });

  // Reverse Geocoding: obter endereço a partir de coordenadas
  app.get("/api/geocode/reverse", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: "Coordenadas inválidas" });
        return;
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${lat}&lon=${lng}&format=json`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'CMTU-LD Zeladoria Dashboard'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const result = await response.json();
      
      res.json({
        display_name: result.display_name,
        address: result.address,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      });
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      res.status(500).json({ error: "Falha ao obter endereço" });
    }
  });

  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  });

  app.patch("/api/config", async (req, res) => {
    try {
      const configSchema = z.object({
        mowingProductionRate: z.object({
          lote1: z.number(),
          lote2: z.number(),
        }).partial().optional(),
        metaMensal: z.number().positive().optional(),
        metaLote1: z.number().positive().optional(),
        metaLote2: z.number().positive().optional(),
      });

      const validatedConfig = configSchema.parse(req.body);
      const updatedConfig = await storage.updateConfig(validatedConfig as any);
      res.json(updatedConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid configuration data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update configuration" });
      }
    }
  });

  app.patch("/api/areas/:id/status", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const statusSchema = z.object({
        status: z.enum(["Pendente", "Em Execução", "Concluído"]),
      });

      const { status } = statusSchema.parse(req.body);
      const updatedArea = await storage.updateAreaStatus(areaId, status);

      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid status data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update area status" });
      }
    }
  });

  app.patch("/api/teams/:id/assign", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const assignSchema = z.object({
        areaId: z.number(),
      });

      const { areaId } = assignSchema.parse(req.body);
      const updatedTeam = await storage.assignTeamToArea(teamId, areaId);

      if (!updatedTeam) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid assignment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to assign team" });
      }
    }
  });

  app.patch("/api/areas/:id/polygon", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const polygonSchema = z.object({
        polygon: z.array(z.object({
          lat: z.number(),
          lng: z.number(),
        })),
      });

      const { polygon } = polygonSchema.parse(req.body);
      const updatedArea = await storage.updateAreaPolygon(areaId, polygon);

      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid polygon data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update polygon" });
      }
    }
  });

  app.patch("/api/areas/:id/position", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const positionSchema = z.object({
        lat: z.number(),
        lng: z.number(),
      });

      const { lat, lng } = positionSchema.parse(req.body);
      const updatedArea = await storage.updateAreaPosition(areaId, lat, lng);

      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid position data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update position" });
      }
    }
  });

  app.patch("/api/areas/:id/executando", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const schema = z.object({
        executando: z.boolean(),
      });

      const { executando } = schema.parse(req.body);
      const updatedArea = await storage.toggleExecutando(areaId, executando);

      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update executando status" });
      }
    }
  });

  app.post("/api/areas/reset-executando", async (_req, res) => {
    try {
      const count = await storage.resetAllExecutando();
      res.json({ message: `${count} áreas resetadas`, count });
    } catch (error) {
      console.error("Error resetting executando:", error);
      res.status(500).json({ error: "Failed to reset executando" });
    }
  });

  app.patch("/api/areas/:id/manual-forecast", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const manualForecastSchema = z.object({
        proximaPrevisao: z.string().min(1),
      });

      const { proximaPrevisao } = manualForecastSchema.parse(req.body);
      
      const updatedArea = await storage.updateArea(areaId, {
        proximaPrevisao,
        manualSchedule: true,
      });

      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid manual forecast data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to set manual forecast" });
      }
    }
  });

  app.patch("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const updateSchema = z.object({
        endereco: z.string().optional(),
        bairro: z.string().optional(),
        metragem_m2: z.number().optional(),
        lote: z.number().optional(),
        ultimaRocagem: z.string().min(1).optional(),
        status: z.enum(["Pendente", "Em Execução", "Concluído"]).optional(),
        registradoPor: z.string().optional(),
      });

      const data = updateSchema.parse(req.body);
      
      // Se está registrando roçagem, adicionar timestamp automático
      if (data.ultimaRocagem) {
        // Calcular próxima previsão: última roçagem + 60 dias
        const lastMowing = new Date(data.ultimaRocagem);
        lastMowing.setHours(0, 0, 0, 0);
        const nextMowingDate = new Date(lastMowing);
        nextMowingDate.setDate(lastMowing.getDate() + 60);
        const proximaPrevisao = nextMowingDate.toISOString().split('T')[0];
        
        const dataComTimestamp = {
          ...data,
          dataRegistro: new Date().toISOString(),
          manualSchedule: false,
          proximaPrevisao, // Previsão calculada diretamente
          status: "Concluído" as const,
        };
        
        // Aplicar atualizações incluindo auditoria e previsão - APENAS nesta área
        const updatedArea = await storage.updateArea(areaId, dataComTimestamp);
        
        if (!updatedArea) {
          res.status(404).json({ error: "Area not found" });
          return;
        }
        
        res.json(updatedArea);
        return;
      }
      
      // Atualizações sem registro de roçagem
      const updatedArea = await storage.updateArea(areaId, data);
      
      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid area data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update area" });
      }
    }
  });

  app.post("/api/areas/:id/history", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const historyEntrySchema = z.object({
        date: z.string(),
        status: z.string(),
        observation: z.string().optional(),
      });

      const entry = historyEntrySchema.parse(req.body);
      const updatedArea = await storage.addHistoryEntry(areaId, entry);

      if (!updatedArea) {
        res.status(404).json({ error: "Area not found" });
        return;
      }

      res.json(updatedArea);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid history entry", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to add history entry" });
      }
    }
  });

  app.post("/api/areas/register-daily", async (req, res) => {
    try {
      const registerSchema = z.object({
        areaIds: z.array(z.number()).min(1, "Selecione pelo menos uma área"),
        date: z.string(),
        type: z.enum(['completed', 'forecast']).default('completed'),
      });

      const { areaIds, date, type } = registerSchema.parse(req.body);
      await storage.registerDailyMowing(areaIds, date, type);

      const typeLabel = type === 'completed' ? 'registrada' : 'prevista';
      res.json({ 
        success: true, 
        message: `${areaIds.length} área(s) ${typeLabel}(s) com sucesso`,
        count: areaIds.length 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Dados inválidos", details: error.errors });
      } else {
        console.error("Error registering daily mowing:", error);
        res.status(500).json({ error: "Falha ao registrar roçagem" });
      }
    }
  });

  // ROTAS ADMIN PERIGOSAS REMOVIDAS:
  // - POST /api/admin/import-data (risco de sobrescrever dados existentes)
  // - POST /api/admin/clear-simulation (apaga todos os registros de roçagem)
  // - POST /api/admin/import-production (não necessário - banco é compartilhado entre dev e produção)

  // Desfazer último registro de roçagem de uma área
  app.delete("/api/areas/:id/rocagem", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      
      if (isNaN(areaId)) {
        res.status(400).json({ error: "ID inválido" });
        return;
      }
      
      // Buscar área atual
      const area = await storage.getAreaById(areaId);
      if (!area) {
        res.status(404).json({ error: "Área não encontrada" });
        return;
      }
      
      // Limpar o registro de roçagem e campos relacionados
      const updatedArea = await storage.updateArea(areaId, {
        ultimaRocagem: null,
        proximaPrevisao: null,
        registradoPor: null,
        dataRegistro: null,
        status: "Pendente" as const,
        manualSchedule: false,
      });
      
      if (!updatedArea) {
        res.status(500).json({ error: "Falha ao desfazer roçagem" });
        return;
      }
      
      res.json({ 
        success: true, 
        message: "Registro de roçagem removido com sucesso",
        area: updatedArea 
      });
    } catch (error) {
      console.error("Error undoing mowing:", error);
      res.status(500).json({ error: "Falha ao desfazer roçagem" });
    }
  });

  app.post("/api/admin/recalculate-schedules", async (req, res) => {
    console.log("📅 Recalculando agendamentos de todas as áreas");
    
    try {
      const { calculateMowingSchedule } = await import('@shared/schedulingAlgorithm');
      
      console.log("📊 Buscando áreas e configurações...");
      const areas = await storage.getAllAreas('rocagem');
      const config = await storage.getConfig();
      
      console.log(`🔢 Processando ${areas.length} áreas...`);
      
      // Calcular para lote 1
      const lote1Results = calculateMowingSchedule(
        areas.filter(a => a.lote === 1),
        1,
        config.mowingProductionRate.lote1,
        new Date()
      );
      
      // Calcular para lote 2
      const lote2Results = calculateMowingSchedule(
        areas.filter(a => a.lote === 2),
        2,
        config.mowingProductionRate.lote2,
        new Date()
      );
      
      const allResults = [...lote1Results, ...lote2Results];
      console.log(`✅ ${allResults.length} previsões calculadas`);
      
      // Atualizar áreas com as previsões
      console.log("💾 Salvando previsões no banco...");
      for (const result of allResults) {
        await storage.updateArea(result.areaId, {
          proximaPrevisao: result.proximaPrevisao,
          daysToComplete: result.daysToComplete
        });
      }
      
      console.log(`✅ Agendamentos recalculados com sucesso!`);
      
      res.json({ 
        success: true, 
        message: `✅ Agendamentos recalculados para ${allResults.length} áreas!`,
        calculated: allResults.length
      });
    } catch (error: any) {
      console.error("💥 ERRO ao recalcular agendamentos:", error);
      res.status(500).json({ 
        error: "Falha ao recalcular agendamentos", 
        details: error.message
      });
    }
  });

  // Reset automático de "executando" à meia-noite (horário de Brasília)
  function getNextMidnightBrasilia(): number {
    // Usar Intl para obter hora atual em Brasília de forma confiável
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(new Date());
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0';
    
    const brasiliaHour = parseInt(getPart('hour'));
    const brasiliaMinute = parseInt(getPart('minute'));
    const brasiliaSecond = parseInt(getPart('second'));
    
    // Milissegundos restantes até meia-noite em Brasília
    const msUntilMidnight = ((23 - brasiliaHour) * 3600 + (59 - brasiliaMinute) * 60 + (60 - brasiliaSecond)) * 1000;
    
    return msUntilMidnight;
  }
  
  function scheduleExecutandoReset() {
    const msUntilMidnight = getNextMidnightBrasilia();
    const hoursUntil = Math.round(msUntilMidnight / 3600000 * 10) / 10;
    
    console.log(`⏰ Reset de "executando" agendado para meia-noite (Brasília) em ~${hoursUntil}h`);
    
    setTimeout(async () => {
      try {
        const count = await storage.resetAllExecutando();
        console.log(`🔄 Reset automático: ${count} áreas tiveram "executando" resetado à meia-noite (Brasília)`);
      } catch (error) {
        console.error("❌ Erro no reset automático de executando:", error);
      }
      // Agendar próximo reset (adiciona 1 min de margem para garantir que já é o dia seguinte)
      setTimeout(() => scheduleExecutandoReset(), 60000);
    }, msUntilMidnight);
  }
  
  scheduleExecutandoReset();

  // Estatísticas de roçagem - metragem mensal, médias, meta
  app.get("/api/stats/rocagem", async (req, res) => {
    try {
      const config = await storage.getConfig();
      const META_LOTE1 = config.metaLote1 ?? 1562500;
      const META_LOTE2 = config.metaLote2 ?? 1562500;
      const META_MENSAL = config.metaMensal ?? (META_LOTE1 + META_LOTE2);
      const now = new Date();
      
      // Usar timezone de Brasília para determinar datas
      const brasiliaFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const todayStr = brasiliaFormatter.format(now); // "YYYY-MM-DD"
      const [yearStr, monthStr] = todayStr.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const day = parseInt(todayStr.split('-')[2]);
      
      // Período: parâmetros opcionais from/to, senão mês atual
      const fromParam = req.query.from as string | undefined;
      const toParam = req.query.to as string | undefined;
      
      const isCustomPeriod = !!(fromParam && toParam);
      const monthPrefix = `${yearStr}-${monthStr}`;
      const fromDate = fromParam || `${monthPrefix}-01`;
      const toDate = toParam || todayStr;
      
      // Calcular ontem
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = brasiliaFormatter.format(yesterdayDate);
      
      // Buscar todas áreas de roçagem
      const rocagemAreas = await storage.getAllAreas('rocagem');
      
      // Áreas roçadas no período
      const areasNoPeriodo = rocagemAreas.filter((a: ServiceArea) => {
        if (!a.ultimaRocagem) return false;
        return a.ultimaRocagem >= fromDate && a.ultimaRocagem <= toDate;
      });
      
      // Áreas roçadas ontem
      const areasOntem = rocagemAreas.filter((a: ServiceArea) => a.ultimaRocagem === yesterdayStr);
      
      // Calcular por lote
      const calcLoteStats = (areas: ServiceArea[], areasY: ServiceArea[], lote: number) => {
        const lotAreas = areas.filter((a: ServiceArea) => a.lote === lote);
        const lotAreasYesterday = areasY.filter((a: ServiceArea) => a.lote === lote);
        const totalM2 = lotAreas.reduce((sum: number, a: ServiceArea) => sum + (a.metragem_m2 || 0), 0);
        const yesterdayM2 = lotAreasYesterday.reduce((sum: number, a: ServiceArea) => sum + (a.metragem_m2 || 0), 0);
        return { totalM2, yesterdayM2, areasCount: lotAreas.length, areasYesterday: lotAreasYesterday.length };
      };
      
      const lote1 = calcLoteStats(areasNoPeriodo, areasOntem, 1);
      const lote2 = calcLoteStats(areasNoPeriodo, areasOntem, 2);
      
      const totalRocado = lote1.totalM2 + lote2.totalM2;
      const totalOntem = lote1.yesterdayM2 + lote2.yesterdayM2;
      const totalAreas = lote1.areasCount + lote2.areasCount;
      
      // Função para contar dias úteis (seg-sex) entre duas datas
      const countWeekdays = (startStr: string, endStr: string): number => {
        const start = new Date(startStr + 'T12:00:00');
        const end = new Date(endStr + 'T12:00:00');
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
          }
          current.setDate(current.getDate() + 1);
        }
        return count;
      };

      // Calcular dias úteis decorridos e restantes
      let diasUteisDecorridos: number;
      let diasUteisRestantes: number;
      
      if (isCustomPeriod) {
        diasUteisDecorridos = Math.max(1, countWeekdays(fromDate, toDate));
        diasUteisRestantes = 0;
      } else {
        diasUteisDecorridos = countWeekdays(`${monthPrefix}-01`, todayStr);
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const lastDayStr = `${monthPrefix}-${String(lastDayOfMonth).padStart(2, '0')}`;
        const tomorrowDate = new Date(now);
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = brasiliaFormatter.format(tomorrowDate);
        diasUteisRestantes = countWeekdays(tomorrowStr, lastDayStr);
      }
      
      // Médias (baseadas em dias úteis)
      const mediaDiaria = diasUteisDecorridos > 0 ? totalRocado / diasUteisDecorridos : 0;
      const faltaParaMeta = Math.max(0, META_MENSAL - totalRocado);
      const mediaNecessaria = diasUteisRestantes > 0 ? faltaParaMeta / diasUteisRestantes : 0;
      const percentualMeta = META_MENSAL > 0 ? (totalRocado / META_MENSAL) * 100 : 0;
      
      // Cálculos individuais por lote
      const faltaLote1 = Math.max(0, META_LOTE1 - lote1.totalM2);
      const faltaLote2 = Math.max(0, META_LOTE2 - lote2.totalM2);
      const necessariaLote1 = diasUteisRestantes > 0 ? faltaLote1 / diasUteisRestantes : 0;
      const necessariaLote2 = diasUteisRestantes > 0 ? faltaLote2 / diasUteisRestantes : 0;
      const percentLote1 = META_LOTE1 > 0 ? (lote1.totalM2 / META_LOTE1) * 100 : 0;
      const percentLote2 = META_LOTE2 > 0 ? (lote2.totalM2 / META_LOTE2) * 100 : 0;

      res.json({
        periodo: { from: fromDate, to: toDate },
        metaMensal: META_MENSAL,
        totalRocado,
        totalAreas,
        mediaDiaria,
        faltaParaMeta,
        diasDecorridos: diasUteisDecorridos,
        diasRestantes: diasUteisRestantes,
        mediaNecessaria,
        percentualMeta,
        rocadoOntem: totalOntem,
        areasOntem: lote1.areasYesterday + lote2.areasYesterday,
        lote1: {
          meta: META_LOTE1,
          totalM2: lote1.totalM2,
          areasCount: lote1.areasCount,
          mediaDiaria: diasUteisDecorridos > 0 ? lote1.totalM2 / diasUteisDecorridos : 0,
          faltaParaMeta: faltaLote1,
          mediaNecessaria: necessariaLote1,
          percentualMeta: percentLote1,
          rocadoOntem: lote1.yesterdayM2,
          areasOntem: lote1.areasYesterday,
        },
        lote2: {
          meta: META_LOTE2,
          totalM2: lote2.totalM2,
          areasCount: lote2.areasCount,
          mediaDiaria: diasUteisDecorridos > 0 ? lote2.totalM2 / diasUteisDecorridos : 0,
          faltaParaMeta: faltaLote2,
          mediaNecessaria: necessariaLote2,
          percentualMeta: percentLote2,
          rocadoOntem: lote2.yesterdayM2,
          areasOntem: lote2.areasYesterday,
        },
      });
    } catch (error) {
      console.error("Error calculating mowing stats:", error);
      res.status(500).json({ error: "Falha ao calcular estatísticas" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
