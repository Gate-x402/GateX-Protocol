import { getEnv } from "@gatex/config";
import type { PaymentProof, VerificationResponse } from "@gatex/common";

export async function verifyPaymentWithFacilitator(
  proof: PaymentProof
): Promise<VerificationResponse> {
  const env = getEnv();
  const facilitatorUrl = `http://localhost:${env.FACILITATOR_PORT}/api/verify`;

  const response = await fetch(facilitatorUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quoteId: proof.quoteId,
      tx: proof.tx,
      token: proof.token,
      amountWei: proof.amountWei,
      requestHash: proof.requestHash,
    }),
  });

  if (!response.ok) {
    throw new Error(`Facilitator verification failed: ${response.statusText}`);
  }

  return (await response.json()) as VerificationResponse;
}

