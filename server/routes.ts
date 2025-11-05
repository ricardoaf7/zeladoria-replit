import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

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

  app.patch("/api/areas/:id", async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const updateSchema = z.object({
        endereco: z.string().optional(),
        bairro: z.string().optional(),
        metragem_m2: z.number().optional(),
        lote: z.number().optional(),
        ultimaRocagem: z.string().optional(),
        status: z.enum(["Pendente", "Em Execução", "Concluído"]).optional(),
        registradoPor: z.string().optional(),
      });

      const data = updateSchema.parse(req.body);
      
      // Se está registrando roçagem, adicionar timestamp automático
      if (data.ultimaRocagem && data.registradoPor) {
        const dataComTimestamp = {
          ...data,
          dataRegistro: new Date().toISOString(),
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

  app.post("/api/admin/import-production", async (req, res) => {
    try {
      console.log("🚀 Iniciando importação de dados para produção...");
      
      // 1. Verificar se já existem dados no banco
      const existingAreas = await storage.getAllAreas('rocagem');
      console.log(`📊 Áreas existentes no banco: ${existingAreas.length}`);
      
      if (existingAreas.length > 500) {
        console.log("⚠️ Banco já contém muitos dados. Abortando importação.");
        res.status(400).json({ 
          error: "O banco já contém dados. Importação bloqueada para evitar duplicação.",
          existingAreas: existingAreas.length,
          recommendation: "Se deseja reimportar, limpe o banco primeiro."
        });
        return;
      }
      
      // 2. Ler arquivo CSV
      const csvPath = path.join(process.cwd(), "server", "data", "areas_londrina.csv");
      
      if (!fs.existsSync(csvPath)) {
        console.log("❌ Arquivo CSV não encontrado");
        res.status(404).json({ error: "Arquivo CSV não encontrado no servidor" });
        return;
      }
      
      console.log(`📂 Lendo arquivo: ${csvPath}`);
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        res.status(400).json({ error: "Arquivo CSV vazio ou inválido" });
        return;
      }
      
      // 3. Processar CSV
      const header = lines[0].split(';').map(h => h.trim());
      const areas: any[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';').map(v => v.trim());
        
        if (values.length < header.length) continue;
        
        const row: any = {};
        header.forEach((h, idx) => {
          row[h] = values[idx];
        });
        
        // Converter formato brasileiro
        const parseBrazilianNumber = (value: string): number => {
          if (!value || value.trim() === '') return 0;
          value = value.replace(/"/g, '').replace(/\./g, '').replace(/,/g, '.');
          return parseFloat(value) || 0;
        };
        
        // Calcular próxima previsão (45 dias)
        const calculateNextForecast = (lote: number, metragem: number): string => {
          const today = new Date();
          const produtividade = lote === 1 ? 85000 : 70000;
          const diasNecessarios = Math.ceil(metragem / produtividade);
          const diasAtePrevisao = 45 - diasNecessarios;
          const proximaPrevisao = new Date(today);
          proximaPrevisao.setDate(proximaPrevisao.getDate() + diasAtePrevisao);
          return proximaPrevisao.toISOString().split('T')[0];
        };
        
        const metragem = parseBrazilianNumber(row['Metragem (m²)'] || row['metragem_m2'] || '0');
        const lat = parseBrazilianNumber(row['Latitude'] || row['lat'] || '0');
        const lng = parseBrazilianNumber(row['Longitude'] || row['lng'] || '0');
        const lote = parseInt(row['Lote'] || row['lote'] || '1');
        
        // Validar coordenadas
        if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          continue;
        }
        
        areas.push({
          tipo: row['Tipo de Item'] || row['tipo_item'] || 'Área de Roçagem',
          endereco: row['Endereço'] || row['endereco'] || '',
          bairro: row['Bairro'] || row['bairro'] || '',
          metragem,
          lat,
          lng,
          lote,
          servico: 'rocagem',
          status: 'Pendente',
          proximaPrevisao: calculateNextForecast(lote, metragem),
          observacoes: row['Observações'] || row['observacoes'] || ''
        });
      }
      
      console.log(`✅ ${areas.length} áreas processadas do CSV`);
      
      // 4. Importar em lotes
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < areas.length; i += batchSize) {
        const batch = areas.slice(i, i + batchSize);
        
        for (const area of batch) {
          await storage.createArea(area);
          imported++;
        }
        
        console.log(`📦 Importados ${imported}/${areas.length} registros...`);
      }
      
      console.log(`🎉 Importação concluída! Total: ${imported} áreas`);
      
      res.json({
        success: true,
        message: `✅ Importação concluída! ${imported} áreas importadas com sucesso.`,
        imported,
        lote1: areas.filter(a => a.lote === 1).length,
        lote2: areas.filter(a => a.lote === 2).length
      });
      
    } catch (error: any) {
      console.error("💥 ERRO na importação:", error);
      res.status(500).json({ 
        error: "Falha ao importar dados", 
        details: error.message
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
