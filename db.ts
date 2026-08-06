import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";

const DB_PATH = process.env.DB_PATH || "./data/tracker.db";

const dir = DB_PATH.substring(0, DB_PATH.lastIndexOf("/"));
if (dir && !existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA foreign_keys=ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS production_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_ref TEXT,
    customer TEXT NOT NULL,
    product TEXT,
    quantity INTEGER DEFAULT 1,
    stage TEXT DEFAULT 'queued' CHECK(stage IN ('queued','fabrication','ready','dispatched')),
    notes TEXT DEFAULT '',
    state TEXT DEFAULT '',
    priority INTEGER DEFAULT 99,
    contact_phone TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

// Lightweight migration: add contact_phone column if the table already existed without it
try {
  const cols = db.query("PRAGMA table_info(production_jobs)").all() as any[];
  const hasContactPhone = cols.some((c) => c.name === "contact_phone");
  if (!hasContactPhone) {
    db.exec("ALTER TABLE production_jobs ADD COLUMN contact_phone TEXT");
  }
} catch (e) {
  console.error("Migration check failed:", e);
}

export default db;
