import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getEnv, getRPCUrl, getTokenAddress } from "@gatex/config";
import { getPrismaClient } from "@gatex/common";
import { createRedisClient } from "./redis";
import { setupMetrics } from "./metrics";
import { quoteRouter } from "./routes/quote";
import { healthRouter } from "./routes/health";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Metrics
setupMetrics(app);

// Routes
app.route("/health", healthRouter);
app.route("/v1", quoteRouter);

// Error handling
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json({ error: err.message }, 500);
});

// Start server
const env = getEnv();
const port = env.MERCHANT_PORT;

console.log(`🚀 Merchant API starting on port ${port}`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Merchant API listening on http://localhost:${info.port}`);
  }
);

