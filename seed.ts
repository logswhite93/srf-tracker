import db from "./db";
import { readFileSync } from "fs";

const jobs = JSON.parse(readFileSync("./seed-data.json", "utf-8"));
const existing = db.query("SELECT COUNT(*) as c FROM production_jobs").get() as any;

if (existing.c === 0) {
  const stmt = db.prepare(
    "INSERT INTO production_jobs (order_ref, customer, product, quantity, stage, notes, state, priority, contact_phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
  for (const j of jobs) {
    // Fall back to "now" for legacy jobs that don't have a created_at/added_at timestamp,
    // so the Days-in-Production indicator starts counting from today.
    const createdAt = j.created_at || j.added_at || nowIso;
    stmt.run(j.order_ref, j.customer, j.product, j.quantity, j.stage, j.notes, j.state, j.priority, j.contact_phone || null, createdAt);
  }
  console.log(`Seeded ${jobs.length} jobs`);
} else {
  console.log(`DB already has ${existing.c} jobs, skipping seed`);
}
