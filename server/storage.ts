import { type Record, type InsertRecord, type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getRecords(): Promise<Record[]>;
  createRecord(record: InsertRecord): Promise<Record>;
  deleteRecord(id: string): Promise<void>;
  clearRecords(): Promise<void>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private records: Map<string, Record>;
  private users: Map<string, User>;

  constructor() {
    this.records = new Map();
    this.users = new Map();
  }

  async getRecords(): Promise<Record[]> {
    return Array.from(this.records.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createRecord(insertRecord: InsertRecord): Promise<Record> {
    const id = insertRecord.id || randomUUID();
    const record: Record = {
      ...insertRecord,
      id,
      createdAt: new Date(),
    };
    this.records.set(id, record);
    return record;
  }

  async deleteRecord(id: string): Promise<void> {
    this.records.delete(id);
  }

  async clearRecords(): Promise<void> {
    this.records.clear();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
