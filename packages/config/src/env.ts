import { config } from "dotenv";
import { z } from "zod";
import type { Network, PayToken } from "@gatex/common";

config();

const EnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  // BNB Chain
  BSC_RPC_URL: z.string().url().optional(),
  BSC_TESTNET_RPC_URL: z.string().url().optional(),
  NETWORK: z.enum(["mainnet", "testnet"]).default("testnet"),

  // Facilitator
  FACILITATOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  FACILITATOR_SIGNER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  // Tokens
  TOKEN_BNB: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  TOKEN_BUSD: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  TOKEN_USDT: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  TOKEN_GTX: z.string().regex(/^0x[a-fA-F0-9]{40}$/),

  // Merchant
  MERCHANT_JWT_SECRET: z.string().min(32),
  MERCHANT_PORT: z.coerce.number().default(3000),

  // Facilitator
  FACILITATOR_PORT: z.coerce.number().default(3001),

  // Prometheus
  PROMETHEUS_PORT: z.coerce.number().default(9090),

  // Merchant Treasury
  MERCHANT_TREASURY: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed:", result.error);
    throw new Error(`Invalid environment variables: ${result.error.message}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getRPCUrl(network: Network): string {
  const env = getEnv();
  if (network === "mainnet") {
    return env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
  }
  return env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545";
}

export function getTokenAddress(token: PayToken): string {
  const env = getEnv();
  const addresses: Record<PayToken, string> = {
    BNB: env.TOKEN_BNB,
    BUSD: env.TOKEN_BUSD,
    USDT: env.TOKEN_USDT,
    GTX: env.TOKEN_GTX,
  };
  return addresses[token];
}

