import db from "./db";
import { readFileSync } from "fs";

const jobs = JSON.parse(readFileSync("./seed-data.json", "utf-8"));
const existing = db.query("SELECT COUNT(*) as c FROM production_jobs").get() as any;

if (existing.c === 0) {
  const stmt = db.prepare(
    "INSERT INTO production_jobs (order_ref, customer, product, quantity, stage, notes, state, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const j of jobs) {
    stmt.run(j.order_ref, j.customer, j.product, j.quantity, j.stage, j.notes, j.state, j.priority);
  }
  console.log(`Seeded ${jobs.length} jobs`);
} else {
  console.log(`DB already has ${existing.c} jobs, skipping seed`);
}
