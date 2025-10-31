import { getEnv } from "@gatex/config";
import type { PaymentProof, VerificationResponse, ExternalServiceError } from "@gatex/common";
import { retry, isRetryableError } from "@gatex/common";
import { logger } from "@gatex/common";

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

export async function verifyPaymentWithFacilitator(
  proof: PaymentProof,
  requestId?: string
): Promise<VerificationResponse> {
  const env = getEnv();
  const facilitatorUrl = `http://localhost:${env.FACILITATOR_PORT}/api/verify`;

  return retry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(facilitatorUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(requestId && { "X-Request-ID": requestId }),
          },
          body: JSON.stringify({
            quoteId: proof.quoteId,
            tx: proof.tx,
            token: proof.token,
            amountWei: proof.amountWei,
            requestHash: proof.requestHash,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Facilitator verification failed: ${response.status} ${errorText}`);
        }

        return (await response.json()) as VerificationResponse;
      } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    },
    {
      maxAttempts: 3,
      initialDelayMs: 200,
      retryable: isRetryableError,
    }
  );
}

