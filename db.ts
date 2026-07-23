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
    stage TEXT DEFAULT 'fabrication' CHECK(stage IN ('fabrication','ready','dispatched')),
    notes TEXT DEFAULT '',
    state TEXT DEFAULT '',
    priority INTEGER DEFAULT 99,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

export default db;
