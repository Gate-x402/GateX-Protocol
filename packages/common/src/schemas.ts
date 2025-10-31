import { z } from "zod";

export const PayTokenSchema = z.enum(["BNB", "BUSD", "USDT", "GTX"]);

export const NetworkSchema = z.enum(["mainnet", "testnet"]);

export const X402ChallengeSchema = z.object({
  standard: z.literal("x402"),
  price: z.string(),
  currency: z.literal("USD"),
  network: z.literal("bsc"),
  payToken: PayTokenSchema,
  treasury: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  quoteId: z.string().uuid(),
  nonce: z.string().min(1),
  expiresAt: z.string(),
  facilitator: z.object({
    url: z.string().url(),
    signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  }),
  requestHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export const PaymentProofSchema = z.object({
  quoteId: z.string().uuid(),
  tx: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  token: PayTokenSchema,
  amountWei: z.string(),
  requestHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  verdict: z.enum(["paid", "unpaid"]).optional(),
  signature: z.string().optional(),
  signer: z.string().optional(),
});

export const VerificationRequestSchema = z.object({
  quoteId: z.string().uuid(),
  tx: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  token: PayTokenSchema,
  amountWei: z.string(),
  requestHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
});

export const VerificationResponseSchema = z.object({
  quoteId: z.string().uuid(),
  verdict: z.enum(["paid", "unpaid"]),
  signature: z.string().optional(),
  signer: z.string().optional(),
  expiresAt: z.string().optional(),
  error: z.string().optional(),
});

export const EndpointConfigSchema = z.object({
  slug: z.string().min(1).max(100),
  basePriceCents: z.number().int().positive(),
  tokenPreference: PayTokenSchema,
  treasury: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  active: z.boolean().default(true),
});

export const RouteQuoteParamsSchema = z.object({
  slug: z.string(),
});

