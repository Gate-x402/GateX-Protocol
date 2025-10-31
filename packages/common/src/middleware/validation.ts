import { Context } from "hono";
import { ZodSchema } from "zod";
import { ValidationError } from "../errors";

export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set("validatedBody", validated);
      await next();
    } catch (error) {
      throw new ValidationError("Invalid request body", error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());
      const validated = schema.parse(query);
      c.set("validatedQuery", validated);
      await next();
    } catch (error) {
      throw new ValidationError("Invalid query parameters", error);
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: () => Promise<void>) => {
    try {
      const params = c.req.param();
      const validated = schema.parse(params);
      c.set("validatedParams", validated);
      await next();
    } catch (error) {
      throw new ValidationError("Invalid route parameters", error);
    }
  };
}

export function validateHeader(name: string, schema?: ZodSchema) {
  return async (c: Context, next: () => Promise<void>) => {
    const header = c.req.header(name);
    if (!header) {
      throw new ValidationError(`Missing required header: ${name}`);
    }

    if (schema) {
      try {
        const validated = schema.parse(header);
        c.set(`validatedHeader_${name}`, validated);
      } catch (error) {
        throw new ValidationError(`Invalid header: ${name}`, error);
      }
    }

    await next();
  };
}

