export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeoutMs: number; // Time to wait before attempting to close circuit
  monitorWindowMs?: number; // Time window for monitoring failures
}

export enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Circuit is open, failing fast
  HALF_OPEN = "half-open", // Testing if service recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime: number = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failures = [];
    } else if (this.state === CircuitState.CLOSED) {
      // Clean up old failures outside monitoring window
      const windowStart = Date.now() - (this.options.monitorWindowMs || 60000);
      this.failures = this.failures.filter((time) => time > windowStart);
    }
  }

  private onFailure() {
    this.lastFailureTime = Date.now();
    this.failures.push(this.lastFailureTime);

    const windowStart = Date.now() - (this.options.monitorWindowMs || 60000);
    this.failures = this.failures.filter((time) => time > windowStart);

    if (this.failures.length >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

