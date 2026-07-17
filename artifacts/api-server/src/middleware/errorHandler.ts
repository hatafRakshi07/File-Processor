/**
 * Express error handler wrapper — prevents unhandled rejections from crashing the server
 * Wraps async route handlers to catch all errors
 */
import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | any>;

/**
 * Wraps an async route handler to catch all errors and pass them to the global error handler
 * Usage: router.get("/path", asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      logger.error({ err, path: req.path, method: req.method }, "Unhandled error in route handler");
      next(err);
    });
  };
}

/**
 * Safely executes parallel promises with fallback values
 * If any promise rejects, returns the fallback instead of crashing
 * Usage: const [user, stats] = await safePromiseAll([
 *   db.select()...,
 *   db.select()... 
 * ], [{}, {}])  // fallbacks
 */
export async function safePromiseAll<T>(
  promises: Promise<T>[],
  fallbacks: T[],
): Promise<T[]> {
  if (promises.length !== fallbacks.length) {
    throw new Error("Promises and fallbacks arrays must have the same length");
  }

  return Promise.allSettled(promises).then((results) =>
    results.map((result, idx) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      logger.warn({ error: result.reason, index: idx }, "Promise rejected in parallel batch, using fallback");
      return fallbacks[idx];
    }),
  );
}

/**
 * Safe database query execution with timeout protection
 * Prevents queries from hanging indefinitely
 */
export async function safeDbQuery<T>(
  query: Promise<T>,
  timeoutMs: number = 30_000,
  fallback?: T,
): Promise<T> {
  try {
    return await Promise.race([
      query,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  } catch (err) {
    logger.error({ err, timeoutMs }, "Database query failed");
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

/**
 * Response guard — prevents double responses
 * Logs if the developer tries to send two responses
 */
export function guardResponse(res: Response, message: string = "") {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let sent = false;

  res.json = function (...args: any[]) {
    if (sent) {
      logger.warn({ message }, "Attempted to send response twice");
      return res;
    }
    sent = true;
    return originalJson(...args);
  };

  res.send = function (...args: any[]) {
    if (sent) {
      logger.warn({ message }, "Attempted to send response twice");
      return res;
    }
    sent = true;
    return originalSend(...args);
  };
}
