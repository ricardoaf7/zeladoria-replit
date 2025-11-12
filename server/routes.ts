import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import type { ServiceArea } from "@shared/schema";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Função para converter ServiceArea[] para CSV compatível com Supabase
function convertToSupabaseCSV(areas: ServiceArea[]): string {
  if (areas.length === 0) {
    return 'id,ordem,sequencia_cadastro,tipo,endereco,bairro,metragem_m2,lat,lng,lote,status,history,polygon,scheduled_date,proxima_previsao,ultima_rocagem,manual_schedule,days_to_complete,servico,registrado_por,data_registro\n';
  }

  // Headers com nomes de colunas do PostgreSQL
  const headers = [
    'id', 'ordem', 'sequencia_cadastro', 'tipo', 'endereco', 'bairro', 
    'metragem_m2', 'lat', 'lng', 'lote', 'status', 'history', 'polygon',
    'scheduled_date', 'proxima_previsao', 'ultima_rocagem', 'manual_schedule',
    'days_to_complete', 'servico', 'registrado_por', 'data_registro'
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
    ];

    csv += row.map(escapeCSVValue).join(',') + '\n';
  }

  return csv;
}

export async function registerRoutes(app: Express): Promise<Server> {
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
        const dataComTimestamp = {
          ...data,
          dataRegistro: new Date().toISOString(),
          manualSchedule: false,
        };
        
        // Aplicar atualizações incluindo auditoria
        const updatedArea = await storage.updateArea(areaId, dataComTimestamp);
        
        if (!updatedArea) {
          res.status(404).json({ error: "Area not found" });
          return;
        }
        
        // Recalcular previsões de todo o lote
        await storage.registerDailyMowing([areaId], data.ultimaRocagem, 'completed');
        
        // Buscar área novamente após recálculo
        const reloadedArea = await storage.getAreaById(areaId);
        if (!reloadedArea) {
          res.status(404).json({ error: "Area not found after recalculation" });
          return;
        }
        
        res.json(reloadedArea);
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

  const httpServer = createServer(app);

  return httpServer;
}
