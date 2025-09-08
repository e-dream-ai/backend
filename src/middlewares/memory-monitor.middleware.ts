import { Request, Response, NextFunction } from "express";

const MEMORY_THRESHOLD_MB = 50;

export const memoryMonitorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const memBefore = process.memoryUsage();
  const startTime = Date.now();

  res.on("finish", () => {
    const memAfter = process.memoryUsage();
    const memDiff = memAfter.heapUsed - memBefore.heapUsed;
    const duration = Date.now() - startTime;

    if (memDiff > MEMORY_THRESHOLD_MB * 1024 * 1024) {
      console.warn(
        `[MEMORY WARNING] ${req.method} ${req.path} - Memory: ${Math.round(
          memDiff / 1024 / 1024,
        )}MB, Duration: ${duration}ms, Status: ${res.statusCode}`,
      );
    }

    if (memDiff > 200 * 1024 * 1024) {
      console.error(
        `[MEMORY CRITICAL] ${req.method} ${req.path} - Memory: ${Math.round(
          memDiff / 1024 / 1024,
        )}MB, Duration: ${duration}ms, Status: ${res.statusCode}`,
      );
    }
  });

  next();
};
