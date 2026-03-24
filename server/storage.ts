import {
  type Record,
  type InsertRecord,
  type User,
  type InsertUser,
  type Trip,
  type InsertTrip,
  type TripExpense,
  type InsertTripExpense,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getRecords(): Promise<Record[]>;
  createRecord(record: InsertRecord): Promise<Record>;
  deleteRecord(id: string): Promise<void>;
  clearRecords(): Promise<void>;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Trips
  getTrips(): Promise<Trip[]>;
  getTrip(id: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  addTripMember(tripId: string, name: string): Promise<Trip>;
  removeTripMember(tripId: string, name: string): Promise<Trip>;
  deleteTrip(id: string): Promise<void>;
  // Trip expenses
  getTripExpenses(tripId: string): Promise<TripExpense[]>;
  createTripExpense(expense: InsertTripExpense): Promise<TripExpense>;
  deleteTripExpense(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private records: Map<string, Record>;
  private users: Map<string, User>;
  private trips: Map<string, Trip>;
  private tripExpenses: Map<string, TripExpense>;

  constructor() {
    this.records = new Map();
    this.users = new Map();
    this.trips = new Map();
    this.tripExpenses = new Map();
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

  async getTrips(): Promise<Trip[]> {
    return Array.from(this.trips.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTrip(id: string): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = randomUUID();
    const trip: Trip = {
      id,
      name: insertTrip.name,
      members: insertTrip.members,
      createdAt: new Date().toISOString(),
    };
    this.trips.set(id, trip);
    return trip;
  }

  async addTripMember(tripId: string, name: string): Promise<Trip> {
    const trip = this.trips.get(tripId);
    if (!trip) throw new Error("Trip not found");
    if (!trip.members.includes(name)) {
      trip.members = [...trip.members, name];
      this.trips.set(tripId, trip);
    }
    return trip;
  }

  async removeTripMember(tripId: string, name: string): Promise<Trip> {
    const trip = this.trips.get(tripId);
    if (!trip) throw new Error("Trip not found");
    trip.members = trip.members.filter((m) => m !== name);
    this.trips.set(tripId, trip);
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    this.trips.delete(id);
    for (const [eid, exp] of this.tripExpenses) {
      if (exp.tripId === id) this.tripExpenses.delete(eid);
    }
  }

  async getTripExpenses(tripId: string): Promise<TripExpense[]> {
    return Array.from(this.tripExpenses.values())
      .filter((e) => e.tripId === tripId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTripExpense(insertExpense: InsertTripExpense): Promise<TripExpense> {
    const id = insertExpense.id || randomUUID();
    const expense: TripExpense = {
      ...insertExpense,
      id,
      createdAt: new Date().toISOString(),
    };
    this.tripExpenses.set(id, expense);
    return expense;
  }

  async deleteTripExpense(id: string): Promise<void> {
    this.tripExpenses.delete(id);
  }
}

export const storage = new MemStorage();
