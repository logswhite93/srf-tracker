import db from "./db";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const PORT = parseInt(process.env.PORT || "3000");
const API_KEY = process.env.API_KEY || "";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function serveStatic(path: string): Response | null {
  const filePath = join(import.meta.dir, "public", path === "/" ? "index.html" : path);
  if (!existsSync(filePath)) return null;
  const file = readFileSync(filePath);
  const ext = filePath.split(".").pop();
  const types: Record<string, string> = {
    html: "text/html", css: "text/css", js: "application/javascript",
    png: "image/png", svg: "image/svg+xml", ico: "image/x-icon", json: "application/json",
  };
  return new Response(file, {
    headers: { "Content-Type": types[ext || "html"] || "application/octet-stream" },
  });
}

function checkApiKey(req: Request): boolean {
  if (!API_KEY) return true;
  const auth = req.headers.get("x-api-key") || new URL(req.url).searchParams.get("api_key");
  return auth === API_KEY;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        },
      });
    }

    if (path.startsWith("/api/")) {
      if (path === "/api/jobs" && req.method === "GET") {
        const rows = db.query("SELECT * FROM production_jobs ORDER BY priority ASC, created_at ASC").all();
        return json(rows);
      }

      if (path === "/api/jobs" && req.method === "POST") {
        if (!checkApiKey(req)) return json({ error: "Unauthorized" }, 401);
        const body = await req.json();
        const stmt = db.prepare(
          "INSERT INTO production_jobs (order_ref, customer, product, quantity, stage, notes, state, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        const result = stmt.run(
          body.order_ref || null, body.customer, body.product || "",
          body.quantity || 1, body.stage || "fabrication", body.notes || "",
          body.state || "", body.priority || 99
        );
        return json({ id: result.lastInsertRowid, success: true }, 201);
      }

      const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/);
      if (jobMatch) {
        const id = parseInt(jobMatch[1]);
        if (req.method === "PATCH") {
          const body = await req.json();
          const updates: string[] = [];
          const values: any[] = [];
          for (const [key, val] of Object.entries(body)) {
            if (["stage", "notes", "customer", "product", "quantity", "state", "priority", "order_ref"].includes(key)) {
              updates.push(`${key} = ?`);
              values.push(val);
            }
          }
          if (updates.length > 0) {
            updates.push("updated_at = datetime('now')");
            values.push(id);
            db.prepare(`UPDATE production_jobs SET ${updates.join(", ")} WHERE id = ?`).run(...values);
          }
          return json({ success: true });
        }

        if (req.method === "DELETE") {
          if (!checkApiKey(req)) return json({ error: "Unauthorized" }, 401);
          db.prepare("DELETE FROM production_jobs WHERE id = ?").run(id);
          return json({ success: true });
        }
      }

      return json({ error: "Not found" }, 404);
    }

    // Static files
    const staticRes = serveStatic(path);
    if (staticRes) return staticRes;
    return serveStatic("/") || new Response("Not found", { status: 404 });
  },
});

console.log(`SRF Production Tracker running on port ${PORT}`);
