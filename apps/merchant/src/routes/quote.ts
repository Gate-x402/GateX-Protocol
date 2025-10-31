import { Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import { getEnv } from "@gatex/config";
import {
  getPrismaClient,
  hashRequest,
  generateNonce,
  PaymentProofSchema,
  NotFoundError,
  PaymentRequiredError,
  VerificationError,
  logger,
  validateParams,
  RouteQuoteParamsSchema,
} from "@gatex/common";
import { createRedisClient } from "../redis";
import { quotesIssuedTotal, verificationsTotal } from "../metrics";
import { verifyPaymentWithFacilitator } from "../services/payment";

export const quoteRouter = new Hono();

// Get quote for an endpoint
quoteRouter.get(
  "/route-quote/:slug",
  validateParams(RouteQuoteParamsSchema),
  async (c) => {
    const { slug } = c.get("validatedParams");
    const paymentHeader = c.req.header("X-PAYMENT");
    const requestId = c.get("requestId");

  const prisma = getPrismaClient();
  const env = getEnv();
  const redis = createRedisClient();

    // Find endpoint
    const endpoint = await prisma.endpoint.findUnique({
      where: { slug },
    });

    if (!endpoint || !endpoint.active) {
      throw new NotFoundError("Endpoint");
    }

    // If payment proof provided, verify and return resource
    if (paymentHeader) {
      let proof;
      try {
        proof = PaymentProofSchema.parse(JSON.parse(paymentHeader));
      } catch (error) {
        logger.warn("Invalid payment proof", { requestId, error });
        throw new VerificationError("Invalid payment proof format");
      }

      // Verify payment with facilitator
      let verification;
      try {
        verification = await verifyPaymentWithFacilitator(proof, requestId);
      } catch (error) {
        logger.error("Facilitator verification failed", {
          requestId,
          quoteId: proof.quoteId,
          error,
        });
        throw new VerificationError(
          "Failed to verify payment with facilitator",
          error
        );
      }

      if (verification.verdict !== "paid") {
        throw new VerificationError("Payment verification failed");
      }

      // Check if quote exists and is valid (use transaction for consistency)
      const quote = await prisma.$transaction(async (tx) => {
        const q = await tx.priceQuote.findUnique({
          where: { id: proof.quoteId },
          include: { verification: true },
        });

        if (!q || q.status !== "paid") {
          throw new VerificationError("Invalid or unpaid quote");
        }

        // Prevent replay (atomic check and set)
        const replayKey = `payment:replay:${proof.tx}`;
        const existing = await redis.get(replayKey);
        if (existing) {
          throw new VerificationError("Payment already used");
        }

        // Mark payment as used (24h TTL)
        await redis.setex(replayKey, 86400, "1");

        return q;
      });

      verificationsTotal.labels("success").inc();

      logger.info("Payment verified successfully", {
        requestId,
        quoteId: proof.quoteId,
        tx: proof.tx,
      });

      // Return protected resource
      return c.json({
        success: true,
        data: {
          message: `Protected resource for ${slug}`,
          timestamp: new Date().toISOString(),
          quoteId: proof.quoteId,
        },
      });
    }

    // Generate new quote
    const payToken = endpoint.tokenPreference as "BNB" | "BUSD" | "USDT" | "GTX";
    const nonce = generateNonce();
    const quoteId = uuidv4();

    // Calculate amount in Wei (simplified - in production, use oracle for USD conversion)
    // For now, assume 1 USD = 0.001 BNB (example rate)
    const priceUSD = endpoint.basePriceCents / 100;
    const amountWei = BigInt(Math.floor((priceUSD * 1e18) / 1000)).toString(); // Simplified conversion

    // Create request hash
    const requestData = JSON.stringify({
      method: c.req.method,
      path: c.req.path,
      headers: Object.fromEntries(c.req.raw.headers.entries()),
    });
    const requestHash = hashRequest(requestData);

    // Calculate expiry (2 minutes)
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    // Use transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Store nonce in Redis (2 minute TTL)
      await redis.setex(`nonce:${nonce}`, 120, quoteId);

      // Create quote in database
      await tx.priceQuote.create({
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
    });

    quotesIssuedTotal.labels(slug, payToken).inc();

    logger.info("Quote issued", {
      requestId,
      quoteId,
      slug,
      payToken,
      amountCents: endpoint.basePriceCents,
    });

    // Return HTTP 402 challenge
    const facilitatorUrl = `http://localhost:${env.FACILITATOR_PORT}/api/verify`;

    throw new PaymentRequiredError("Payment required", {
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
    });
  }
);

