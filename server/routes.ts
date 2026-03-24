import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRecordSchema } from "@shared/schema";
import { z } from "zod";

const insertTripSchema = z.object({
  name: z.string().min(1),
  members: z.array(z.string().min(1)).min(2),
});

const insertTripExpenseSchema = z.object({
  id: z.string().optional(),
  tripId: z.string(),
  item: z.string().min(1),
  amount: z.number().positive(),
  paidBy: z.string().min(1),
  splitAmong: z.array(z.string().min(1)).min(1),
  date: z.string().min(1),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // --- Daily records ---
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

  // --- Trips ---
  app.get("/api/trips", async (_req, res) => {
    const trips = await storage.getTrips();
    res.json(trips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    const trip = await storage.getTrip(req.params.id);
    if (!trip) return res.status(404).json({ error: "Not found" });
    res.json(trip);
  });

  app.post("/api/trips", async (req, res) => {
    const parsed = insertTripSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const trip = await storage.createTrip(parsed.data);
    res.status(201).json(trip);
  });

  app.post("/api/trips/:id/members", async (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string") return res.status(400).json({ error: "name required" });
    try {
      const trip = await storage.addTripMember(req.params.id, name.trim());
      res.json(trip);
    } catch {
      res.status(404).json({ error: "Trip not found" });
    }
  });

  app.delete("/api/trips/:id/members/:name", async (req, res) => {
    try {
      const trip = await storage.removeTripMember(req.params.id, decodeURIComponent(req.params.name));
      res.json(trip);
    } catch {
      res.status(404).json({ error: "Trip not found" });
    }
  });

  app.delete("/api/trips/:id", async (req, res) => {
    await storage.deleteTrip(req.params.id);
    res.status(204).end();
  });

  // --- Trip expenses ---
  app.get("/api/trips/:id/expenses", async (req, res) => {
    const expenses = await storage.getTripExpenses(req.params.id);
    res.json(expenses);
  });

  app.post("/api/trips/:id/expenses", async (req, res) => {
    const parsed = insertTripExpenseSchema.safeParse({ ...req.body, tripId: req.params.id });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const expense = await storage.createTripExpense(parsed.data);
    res.status(201).json(expense);
  });

  app.delete("/api/trips/:id/expenses/:eid", async (req, res) => {
    await storage.deleteTripExpense(req.params.eid);
    res.status(204).end();
  });

  return httpServer;
}
