import { JsonRpcProvider } from "ethers";
import { createBNBProvider } from "./provider";
import { retry, isRetryableError, CircuitBreaker } from "@gatex/common";
import type { Network } from "@gatex/common";

const circuitBreakers = new Map<string, CircuitBreaker>();

export function createBNBProviderWithRetry(
  network: Network,
  rpcUrl: string,
  options?: {
    maxRetries?: number;
    circuitBreaker?: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
    };
  }
): JsonRpcProvider {
  const provider = createBNBProvider(network, rpcUrl);
  const key = `${network}:${rpcUrl}`;

  // Get or create circuit breaker
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(
      key,
      new CircuitBreaker({
        failureThreshold: options?.circuitBreaker?.failureThreshold || 5,
        resetTimeoutMs: options?.circuitBreaker?.resetTimeoutMs || 30000,
      })
    );
  }

  const circuitBreaker = circuitBreakers.get(key)!;

  // Wrap provider methods with retry and circuit breaker
  const originalCall = provider._send.bind(provider);
  provider._send = async (payload: any, callback?: any) => {
    return circuitBreaker.execute(async () => {
      return retry(
        () => originalCall(payload, callback),
        {
          maxAttempts: options?.maxRetries || 3,
          retryable: isRetryableError,
        }
      );
    });
  };

  return provider;
}

