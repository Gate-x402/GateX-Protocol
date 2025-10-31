import { Hono } from "hono";
import { Registry, Counter, Histogram } from "prom-client";

const register = new Registry();

export const verificationsTotal = new Counter({
  name: "facilitator_verifications_total",
  help: "Total number of payment verifications",
  labelNames: ["verdict", "token"],
  registers: [register],
});

export const verificationLatency = new Histogram({
  name: "facilitator_verification_latency_seconds",
  help: "Verification latency in seconds",
  labelNames: ["verdict"],
  registers: [register],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export function setupMetrics(app: Hono) {
  // Metrics endpoint
  app.get("/metrics", async (c) => {
    c.header("Content-Type", register.contentType);
    return c.text(await register.metrics());
  });

  // Request timing middleware
  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    const duration = (Date.now() - start) / 1000;
    verificationLatency.labels("unknown").observe(duration);
  });
}

