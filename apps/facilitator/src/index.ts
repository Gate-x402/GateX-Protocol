import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getEnv } from "@gatex/config";
import { setupMetrics } from "./metrics";
import { verifyRouter } from "./routes/verify";
import { healthRouter } from "./routes/health";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Metrics
setupMetrics(app);

// Routes
app.route("/health", healthRouter);
app.route("/api", verifyRouter);

// Error handling
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json({ error: err.message }, 500);
});

// Start server
const env = getEnv();
const port = env.FACILITATOR_PORT;

console.log(`🚀 Facilitator API starting on port ${port}`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Facilitator API listening on http://localhost:${info.port}`);
    console.log(`📝 Signer address: ${env.FACILITATOR_SIGNER_ADDRESS}`);
  }
);

