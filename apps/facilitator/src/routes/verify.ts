import { Hono } from "hono";
import { Wallet, Contract } from "ethers";
import { getEnv, getRPCUrl, getTokenAddress } from "@gatex/config";
import {
  getPrismaClient,
  VerificationRequestSchema,
  NotFoundError,
  ValidationError,
  logger,
  validateBody,
} from "@gatex/common";
import { createBNBProviderWithRetry } from "@gatex/evm";
import {
  ERC20_ABI,
  verifyBNBPayment,
  verifyERC20Payment,
} from "@gatex/evm";
import { signVerdict } from "@gatex/evm";
import { verificationsTotal, verificationLatency } from "../metrics";

export const verifyRouter = new Hono();

verifyRouter.post(
  "/verify",
  validateBody(VerificationRequestSchema),
  async (c) => {
    const start = Date.now();
    const requestId = c.get("requestId");
    const request = c.get("validatedBody");

    const env = getEnv();
    const prisma = getPrismaClient();

    // Get quote from database
    const quote = await prisma.priceQuote.findUnique({
      where: { id: request.quoteId },
      include: { endpoint: true },
    });

    if (!quote) {
      verificationsTotal.labels("unpaid", request.token).inc();
      logger.warn("Quote not found", { requestId, quoteId: request.quoteId });
      throw new NotFoundError("Quote");
    }

    // Check if quote is expired
    if (new Date() > quote.expiresAt) {
      verificationsTotal.labels("unpaid", request.token).inc();
      await prisma.priceQuote.update({
        where: { id: request.quoteId },
        data: { status: "expired" },
      });
      logger.warn("Quote expired", { requestId, quoteId: request.quoteId });
      throw new ValidationError("Quote expired");
    }

    // Create provider with retry and circuit breaker
    const rpcUrl = getRPCUrl(env.NETWORK);
    const provider = createBNBProviderWithRetry(env.NETWORK, rpcUrl, {
      maxRetries: 3,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeoutMs: 30000,
      },
    });

    // Parse amounts
    const minAmount = BigInt(request.amountWei);
    const treasury = quote.treasury;

    let verificationResult: { success: boolean; amount: bigint; from: string };

    // Verify payment based on token type
    try {
      if (request.token === "BNB") {
        verificationResult = await verifyBNBPayment(
          provider,
          request.tx,
          treasury,
          minAmount
        );
      } else {
        // ERC-20 token
        const tokenAddress = getTokenAddress(request.token);
        const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
        verificationResult = await verifyERC20Payment(
          tokenContract,
          request.tx,
          treasury,
          minAmount
        );
      }
    } catch (error) {
      logger.error("Payment verification failed", {
        requestId,
        quoteId: request.quoteId,
        tx: request.tx,
        error,
      });
      throw error;
    }

    const verdict = verificationResult.success ? "paid" : "unpaid";

    verificationsTotal.labels(verdict, request.token).inc();

    if (!verificationResult.success) {
      // Update quote status
      await prisma.priceQuote.update({
        where: { id: request.quoteId },
        data: { status: "failed" },
      });

      verificationLatency.labels("unpaid").observe((Date.now() - start) / 1000);

      logger.warn("Payment verification failed", {
        requestId,
        quoteId: request.quoteId,
        tx: request.tx,
        reason: "insufficient amount or invalid recipient",
      });

      return c.json({
        quoteId: request.quoteId,
        verdict: "unpaid",
        error: "Payment verification failed: insufficient amount or invalid recipient",
      });
    }

    // Create wallet for signing
    const wallet = new Wallet(env.FACILITATOR_PRIVATE_KEY, provider);

    // Sign verdict
    const signature = await signVerdict(wallet, request);

    // Calculate expiry (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store verification in database (use transaction for consistency)
    await prisma.$transaction(async (tx) => {
      // Store verification
      await tx.verification.create({
        data: {
          quoteId: request.quoteId,
          verdict: "paid",
          signature,
          signer: env.FACILITATOR_SIGNER_ADDRESS,
          expiresAt,
        },
      });

      // Update quote status
      await tx.priceQuote.update({
        where: { id: request.quoteId },
        data: { status: "paid" },
      });

      // Get or create payment record
      const receipt = await provider.getTransactionReceipt(request.tx);
      await tx.payment.upsert({
        where: { tx: request.tx },
        create: {
          tx: request.tx,
          quoteId: request.quoteId,
          payer: verificationResult.from,
          token: request.token,
          amountWei: verificationResult.amount.toString(),
          blockNumber: receipt?.blockNumber,
          status: "confirmed",
        },
        update: {
          status: "confirmed",
          blockNumber: receipt?.blockNumber,
        },
      });
    });

    verificationLatency.labels("paid").observe((Date.now() - start) / 1000);

    logger.info("Payment verified successfully", {
      requestId,
      quoteId: request.quoteId,
      tx: request.tx,
      payer: verificationResult.from,
      amount: verificationResult.amount.toString(),
    });

    return c.json({
      quoteId: request.quoteId,
      verdict: "paid",
      signature,
      signer: env.FACILITATOR_SIGNER_ADDRESS,
      expiresAt: expiresAt.toISOString(),
    });
  }
);

