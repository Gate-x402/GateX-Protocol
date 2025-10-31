export type Network = "mainnet" | "testnet";

export type PayToken = "BNB" | "BUSD" | "USDT" | "GTX";

export interface X402Challenge {
  standard: "x402";
  price: string;
  currency: "USD";
  network: "bsc";
  payToken: PayToken;
  treasury: string;
  quoteId: string;
  nonce: string;
  expiresAt: string;
  facilitator: {
    url: string;
    signer: string;
  };
  requestHash: string;
}

export interface PaymentProof {
  quoteId: string;
  tx: string;
  token: string;
  amountWei: string;
  requestHash: string;
  verdict?: string;
  signature?: string;
  signer?: string;
}

export interface VerificationRequest {
  quoteId: string;
  tx: string;
  token: PayToken;
  amountWei: string;
  requestHash: string;
}

export interface VerificationResponse {
  quoteId: string;
  verdict: "paid" | "unpaid";
  signature?: string;
  signer?: string;
  expiresAt?: string;
  error?: string;
}

export interface EndpointConfig {
  slug: string;
  basePriceCents: number;
  tokenPreference: PayToken;
  treasury: string;
  active: boolean;
}

export interface QuoteStatus {
  status: "pending" | "paid" | "expired" | "failed";
}

export interface PaymentStatus {
  status: "pending" | "confirmed" | "failed";
}

