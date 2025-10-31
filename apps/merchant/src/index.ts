import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { getEnv } from "@gatex/config";
import { errorHandler, requestId, logger } from "@gatex/common";
import { createRedisClient } from "./redis";
import { setupMetrics, createRateLimitMiddleware } from "./metrics";
import { quoteRouter } from "./routes/quote";
import { healthRouter } from "./routes/health";

const app = new Hono();

// Request ID middleware (must be first)
app.use("*", requestId);

// Structured logging
app.use("*", honoLogger((message) => {
  logger.debug(message);
}));

// CORS
app.use("*", cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-PAYMENT", "X-Request-ID"],
}));

// Security headers
app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
});

// Rate limiting
const redis = createRedisClient();
const rateLimit = createRateLimitMiddleware(redis);
app.use("*", rateLimit);

// Metrics
setupMetrics(app);

// Routes
app.route("/health", healthRouter);
app.route("/v1", quoteRouter);

// Error handling (must be last)
app.onError(errorHandler);

// Start server
const env = getEnv();
const port = env.MERCHANT_PORT;

logger.info("Merchant API starting", { port });

const server = serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.info("Merchant API listening", {
      url: `http://localhost:${info.port}`,
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
    redis.disconnect();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", { error });
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

