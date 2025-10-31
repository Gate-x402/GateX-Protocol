import { Context, Next } from "hono";
import { v4 as uuidv4 } from "uuid";

export async function requestId(c: Context, next: Next) {
  const id = c.req.header("x-request-id") || uuidv4();
  c.header("x-request-id", id);
  c.set("requestId", id);
  await next();
}

