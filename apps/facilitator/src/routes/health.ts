import { Hono } from "hono";
import { getEnv } from "@gatex/config";

export const healthRouter = new Hono();

healthRouter.get("/", async (c) => {
  const env = getEnv();

  return c.json({
    status: "healthy",
    signer: env.FACILITATOR_SIGNER_ADDRESS,
    network: env.NETWORK,
    timestamp: new Date().toISOString(),
  });
});

