import { Hono } from "hono";
import { getPrismaClient } from "@gatex/common";
import { createRedisClient } from "../redis";

export const healthRouter = new Hono();

healthRouter.get("/", async (c) => {
  const checks: Record<string, string> = {};

  // Database check
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "healthy";
  } catch (err) {
    checks.database = `unhealthy: ${err instanceof Error ? err.message : "unknown"}`;
  }

  // Redis check
  try {
    const redis = createRedisClient();
    await redis.ping();
    checks.redis = "healthy";
  } catch (err) {
    checks.redis = `unhealthy: ${err instanceof Error ? err.message : "unknown"}`;
  }

  const allHealthy = Object.values(checks).every((status) => status === "healthy");

  return c.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503
  );
});

