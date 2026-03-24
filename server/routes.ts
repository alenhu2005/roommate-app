import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRecordSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/records", async (_req, res) => {
    const records = await storage.getRecords();
    res.json(records);
  });

  app.post("/api/records", async (req, res) => {
    const parsed = insertRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }
    const record = await storage.createRecord(parsed.data);
    res.status(201).json(record);
  });

  app.delete("/api/records/:id", async (req, res) => {
    await storage.deleteRecord(req.params.id);
    res.status(204).end();
  });

  app.delete("/api/records", async (_req, res) => {
    await storage.clearRecords();
    res.status(204).end();
  });

  return httpServer;
}
