import { Hono } from "hono";
import { Registry, Counter, Histogram } from "prom-client";
import { getEnv } from "@gatex/config";
import { createRateLimit } from "@gatex/common";
import type Redis from "ioredis";

const register = new Registry();

export const quotesIssuedTotal = new Counter({
  name: "quotes_issued_total",
  help: "Total number of price quotes issued",
  labelNames: ["endpoint_slug", "pay_token"],
  registers: [register],
});

export const verificationsTotal = new Counter({
  name: "verifications_total",
  help: "Total number of payment verifications",
  labelNames: ["status"],
  registers: [register],
});

export const requestLatency = new Histogram({
  name: "request_latency_seconds",
  help: "Request latency in seconds",
  labelNames: ["method", "path", "status"],
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export function setupMetrics(app: Hono) {
  // Metrics endpoint
  app.get("/metrics", async (c) => {
    const env = getEnv();
    c.header("Content-Type", register.contentType);
    return c.text(await register.metrics());
  });

  // Request timing middleware
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const duration = (Date.now() - start) / 1000;
    requestLatency
      .labels(c.req.method, c.req.path, c.res.status.toString())
      .observe(duration);
  });
}

export function createRateLimitMiddleware(redis: Redis) {
  return createRateLimit(redis, {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  });
}
