import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
          lote1: z.number().optional(),
          lote2: z.number().optional(),
        }).optional(),
      });

      const validatedConfig = configSchema.parse(req.body);
      const updatedConfig = await storage.updateConfig(validatedConfig);
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

  const httpServer = createServer(app);

  return httpServer;
}
