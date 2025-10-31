import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { Wallet } from "ethers";
import { getEnv, getRPCUrl, getTokenAddress } from "@gatex/config";
import { getPrismaClient, VerificationRequestSchema } from "@gatex/common";
import {
  createBNBProvider,
  ERC20_ABI,
  verifyBNBPayment,
  verifyERC20Payment,
} from "@gatex/evm";
import { signVerdict, createVerdictMessage } from "@gatex/evm";
import { verificationsTotal, verificationLatency } from "../metrics";

export const verifyRouter = new Hono();

verifyRouter.post("/verify", async (c) => {
  const start = Date.now();

  try {
    const body = await c.req.json();
    const request = VerificationRequestSchema.parse(body);

    const env = getEnv();
    const prisma = getPrismaClient();

    // Get quote from database
    const quote = await prisma.priceQuote.findUnique({
      where: { id: request.quoteId },
      include: { endpoint: true },
    });

    if (!quote) {
      verificationsTotal.labels("unpaid", request.token).inc();
      throw new HTTPException(404, { message: "Quote not found" });
    }

    // Check if quote is expired
    if (new Date() > quote.expiresAt) {
      verificationsTotal.labels("unpaid", request.token).inc();
      await prisma.priceQuote.update({
        where: { id: request.quoteId },
        data: { status: "expired" },
      });
      throw new HTTPException(400, { message: "Quote expired" });
    }

    // Create provider
    const rpcUrl = getRPCUrl(env.NETWORK);
    const provider = createBNBProvider(env.NETWORK, rpcUrl);

    // Parse amounts
    const minAmount = BigInt(request.amountWei);
    const treasury = quote.treasury;

    let verificationResult: { success: boolean; amount: bigint; from: string };

    // Verify payment based on token type
    if (request.token === "BNB") {
      verificationResult = await verifyBNBPayment(provider, request.tx, treasury, minAmount);
    } else {
      // ERC-20 token
      const { Contract } = await import("ethers");
      const tokenAddress = getTokenAddress(request.token);
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);
      verificationResult = await verifyERC20Payment(
        tokenContract,
        request.tx,
        treasury,
        minAmount
      );
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

    // Store verification in database
    await prisma.verification.create({
      data: {
        quoteId: request.quoteId,
        verdict: "paid",
        signature,
        signer: env.FACILITATOR_SIGNER_ADDRESS,
        expiresAt,
      },
    });

    // Update quote and payment status
    await prisma.priceQuote.update({
      where: { id: request.quoteId },
      data: { status: "paid" },
    });

    // Get or create payment record
    const receipt = await provider.getTransactionReceipt(request.tx);
    await prisma.payment.upsert({
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

    verificationLatency.labels("paid").observe((Date.now() - start) / 1000);

    return c.json({
      quoteId: request.quoteId,
      verdict: "paid",
      signature,
      signer: env.FACILITATOR_SIGNER_ADDRESS,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    verificationLatency.labels("error").observe((Date.now() - start) / 1000);

    if (err instanceof HTTPException) {
      throw err;
    }

    console.error("Verification error:", err);
    throw new HTTPException(500, {
      message: `Verification failed: ${err instanceof Error ? err.message : "unknown"}`,
    });
  }
});

