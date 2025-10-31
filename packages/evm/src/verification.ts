import { Wallet } from "ethers";
import type { VerificationRequest, VerificationResponse } from "@gatex/common";

export interface VerdictMessage {
  quoteId: string;
  tx: string;
  token: string;
  amountWei: string;
  requestHash: string;
}

export function createVerdictMessage(request: VerificationRequest): string {
  return JSON.stringify({
    quoteId: request.quoteId,
    tx: request.tx,
    token: request.token,
    amountWei: request.amountWei,
    requestHash: request.requestHash,
  });
}

export async function signVerdict(
  wallet: Wallet,
  request: VerificationRequest
): Promise<string> {
  const message = createVerdictMessage(request);
  return await wallet.signMessage(message);
}

export async function verifySignature(
  message: string,
  signature: string,
  expectedSigner: string
): Promise<boolean> {
  try {
    const { verifyMessage } = await import("ethers");
    const recovered = verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  } catch {
    return false;
  }
}

