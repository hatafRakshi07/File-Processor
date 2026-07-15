import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pingDb } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res): Promise<void> => {
  let dbOk = false;
  let dbLatencyMs: number | null = null;

  const start = Date.now();
  try {
    await pingDb();
    dbOk = true;
    dbLatencyMs = Date.now() - start;
  } catch {
    // db unreachable — return 503 but still return JSON
  }

  const status = dbOk ? "ok" : "degraded";
  const data = HealthCheckResponse.parse({ status });

  res.status(dbOk ? 200 : 503).json({
    ...data,
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
