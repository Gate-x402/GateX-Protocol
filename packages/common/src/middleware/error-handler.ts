import { Context, ErrorHandler } from "hono";
import { AppError, handleError, formatErrorResponse, PaymentRequiredError } from "../errors";
import { logger } from "../utils/logger";

export const errorHandler: ErrorHandler = (err: Error, c: Context) => {
  const requestId = c.get("requestId") || "unknown";
  const error = handleError(err);

  // Special handling for PaymentRequiredError (HTTP 402)
  if (error instanceof PaymentRequiredError && error.details) {
    logger.info("Payment required", {
      requestId,
      code: error.code,
    });
    return c.json(error.details, 402);
  }

  logger.error(error.message, {
    requestId,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
  });

  return c.json(formatErrorResponse(error), error.statusCode);
};

