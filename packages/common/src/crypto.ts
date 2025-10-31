import { createHash } from "crypto";

/**
 * Generate SHA-256 hash of request data
 */
export function hashRequest(data: string): string {
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

/**
 * Generate a cryptographically secure random nonce
 */
export function generateNonce(): string {
  return createHash("sha256")
    .update(`${Date.now()}-${Math.random()}`)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Verify ECDSA signature (to be implemented with ethers in evm package)
 */
export function isValidSignature(message: string, signature: string, signer: string): boolean {
  // This will be implemented using ethers.js verifyMessage
  // Placeholder for now
  return true;
}

