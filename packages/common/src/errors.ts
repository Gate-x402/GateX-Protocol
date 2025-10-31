import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message: string = "Payment required", challenge?: unknown) {
    super(message, "PAYMENT_REQUIRED", 402, challenge);
  }
}

export class VerificationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VERIFICATION_ERROR", 402, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "DATABASE_ERROR", 500, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: unknown) {
    super(`${service}: ${message}`, "EXTERNAL_SERVICE_ERROR", 502, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, "RATE_LIMIT_EXCEEDED", 429, { retryAfter });
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError("Validation failed", {
      errors: error.errors,
    });
  }

  if (error instanceof Error) {
    return new AppError(error.message, "INTERNAL_ERROR", 500);
  }

  return new AppError("An unknown error occurred", "UNKNOWN_ERROR", 500);
}

export function formatErrorResponse(error: AppError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
      }),
    },
  };
}

