# 室友記帳本 (Roommate Expense Tracker)

A clean, modern roommate expense tracking app built with React + Express.

## Architecture

**Frontend:** React + TypeScript + TanStack Query + shadcn/ui + Tailwind CSS
**Backend:** Express.js with in-memory storage
**Shared:** Drizzle-ORM schema + Zod validation

## Features

- Record shared expenses with date, item name, and amount
- Choose who paid (me or roommate)
- Three split modes: equal split, only me, only roommate
- Real-time balance calculation (who owes who)
- Delete individual records
- Clear all records
- Beautiful balance card with color-coded status (green/red/neutral)
- Responsive mobile-friendly design

## File Structure

- `client/src/pages/home.tsx` — Main page with all UI
- `client/src/App.tsx` — App root + routing
- `client/src/index.css` — Theme CSS variables (blue palette)
- `shared/schema.ts` — Record schema (Drizzle + Zod)
- `server/storage.ts` — In-memory storage implementation
- `server/routes.ts` — REST API endpoints

## API Endpoints

- `GET /api/records` — Get all records (sorted newest first)
- `POST /api/records` — Create a new record
- `DELETE /api/records/:id` — Delete a single record
- `DELETE /api/records` — Clear all records

## Design

- Primary color: Blue (213 72% 55%)
- Font: Inter
- Theme: Light/Dark compatible
- Component library: shadcn/ui
