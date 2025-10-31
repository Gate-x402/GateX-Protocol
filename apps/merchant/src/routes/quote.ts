import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { v4 as uuidv4 } from "uuid";
import { getEnv, getRPCUrl, getTokenAddress } from "@gatex/config";
import { getPrismaClient, hashRequest, generateNonce, PaymentProofSchema } from "@gatex/common";
import { createRedisClient } from "../redis";
import { quotesIssuedTotal, verificationsTotal } from "../metrics";
import { verifyPaymentWithFacilitator } from "../services/payment";

export const quoteRouter = new Hono();

// Get quote for an endpoint
quoteRouter.get("/route-quote/:slug", async (c) => {
  const slug = c.req.param("slug");
  const paymentHeader = c.req.header("X-PAYMENT");

  const prisma = getPrismaClient();
  const env = getEnv();
  const redis = createRedisClient();

  // Find endpoint
  const endpoint = await prisma.endpoint.findUnique({
    where: { slug },
  });

  if (!endpoint || !endpoint.active) {
    throw new HTTPException(404, { message: "Endpoint not found" });
  }

  // If payment proof provided, verify and return resource
  if (paymentHeader) {
    try {
      const proof = PaymentProofSchema.parse(JSON.parse(paymentHeader));

      // Verify payment with facilitator
      const verification = await verifyPaymentWithFacilitator(proof);

      if (verification.verdict !== "paid") {
        throw new HTTPException(402, { message: "Payment verification failed" });
      }

      // Check if quote exists and is valid
      const quote = await prisma.priceQuote.findUnique({
        where: { id: proof.quoteId },
        include: { verification: true },
      });

      if (!quote || quote.status !== "paid") {
        throw new HTTPException(402, { message: "Invalid or unpaid quote" });
      }

      // Prevent replay
      const replayKey = `payment:replay:${proof.tx}`;
      const existing = await redis.get(replayKey);
      if (existing) {
        throw new HTTPException(402, { message: "Payment already used" });
      }

      // Mark payment as used (24h TTL)
      await redis.setex(replayKey, 86400, "1");

      verificationsTotal.labels("success").inc();

      // Return protected resource
      return c.json({
        success: true,
        data: {
          message: `Protected resource for ${slug}`,
          timestamp: new Date().toISOString(),
          quoteId: proof.quoteId,
        },
      });
    } catch (err) {
      verificationsTotal.labels("failed").inc();
      if (err instanceof HTTPException) {
        throw err;
      }
      throw new HTTPException(402, {
        message: `Payment verification failed: ${err instanceof Error ? err.message : "unknown"}`,
      });
    }
  }

  // Generate new quote
  const payToken = endpoint.tokenPreference as "BNB" | "BUSD" | "USDT" | "GTX";
  const nonce = generateNonce();
  const quoteId = uuidv4();
  const network = env.NETWORK;

  // Calculate amount in Wei (simplified - in production, use oracle for USD conversion)
  // For now, assume 1 USD = 0.001 BNB (example rate)
  const priceUSD = endpoint.basePriceCents / 100;
  const amountWei = BigInt(Math.floor(priceUSD * 1e18 / 1000)).toString(); // Simplified conversion

  // Create request hash
  const requestData = JSON.stringify({
    method: c.req.method,
    path: c.req.path,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
  });
  const requestHash = hashRequest(requestData);

  // Calculate expiry (2 minutes)
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

  // Store nonce in Redis (2 minute TTL)
  await redis.setex(`nonce:${nonce}`, 120, quoteId);

  // Create quote in database
  await prisma.priceQuote.create({
    data: {
      id: quoteId,
      endpointId: endpoint.id,
      nonce,
      requestHash,
      payToken,
      treasury: endpoint.treasury,
      amountCents: endpoint.basePriceCents,
      amountWei,
      expiresAt,
      status: "pending",
    },
  });

  quotesIssuedTotal.labels(slug, payToken).inc();

  // Return HTTP 402 challenge
  const facilitatorUrl = `http://localhost:${env.FACILITATOR_PORT}/api/verify`;

  return c.json(
    {
      standard: "x402",
      price: priceUSD.toFixed(2),
      currency: "USD",
      network: "bsc",
      payToken,
      treasury: endpoint.treasury,
      quoteId,
      nonce,
      expiresAt: expiresAt.toISOString(),
      facilitator: {
        url: facilitatorUrl,
        signer: env.FACILITATOR_SIGNER_ADDRESS,
      },
      requestHash,
    },
    402
  );
});

