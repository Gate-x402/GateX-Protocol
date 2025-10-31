import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { getEnv } from "@gatex/config";
import { errorHandler, requestId, logger } from "@gatex/common";
import { getPrismaClient } from "@gatex/common";
import { setupMetrics } from "./metrics";
import { verifyRouter } from "./routes/verify";
import { healthRouter } from "./routes/health";

const app = new Hono();

// Request ID middleware
app.use("*", requestId);

// Structured logging
app.use("*", honoLogger((message) => {
  logger.debug(message);
}));

// CORS
app.use("*", cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
}));

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
});

// Metrics
setupMetrics(app);

// Routes
app.route("/health", healthRouter);
app.route("/api", verifyRouter);

// Error handling
app.onError(errorHandler);

// Start server
const env = getEnv();
const port = env.FACILITATOR_PORT;

logger.info("Facilitator API starting", { port, signer: env.FACILITATOR_SIGNER_ADDRESS });

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info("Facilitator API listening", {
      url: `http://localhost:${info.port}`,
      signer: env.FACILITATOR_SIGNER_ADDRESS,
    });
  }
);

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    server.close();
    const prisma = getPrismaClient();
    await prisma.$disconnect();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", { error });
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

