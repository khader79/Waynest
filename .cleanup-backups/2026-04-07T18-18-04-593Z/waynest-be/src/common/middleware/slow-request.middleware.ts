import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

export function slowRequestMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const start = Date.now();
  const threshold = Number(process.env.SLOW_REQUEST_MS) || 800;
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > threshold) {
      Logger.warn(
        `Slow request ${req.method} ${req.originalUrl} took ${ms}ms`,
        'SlowRequest',
      );
    }
  });
  next();
}
