import type { NextFunction, Request, Response } from "express";

/**
 * Minimal in-memory sliding-window rate limiter for a single server instance.
 * No external dependency required. If you later run multiple instances behind
 * a load balancer, replace the Map with a shared store (e.g. Redis) so limits
 * are enforced consistently across instances.
 */
export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Periodically clear stale entries so this Map doesn't grow unbounded.
  setInterval(() => {
    const now = Date.now();
    hits.forEach((entry, key) => {
      if (entry.resetAt <= now) hits.delete(key);
    });
  }, options.windowMs).unref();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.max) {
      res.status(429).json({ error: options.message ?? "Too many requests, please try again shortly." });
      return;
    }

    entry.count += 1;
    next();
  };
}
