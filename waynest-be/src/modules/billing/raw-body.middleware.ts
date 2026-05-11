import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Ensures rawBody is a string on the request.
 * NestJS with rawBody:true provides req.rawBody as Buffer;
 * this normalizes it to string for webhook signature verification.
 */
@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const raw = (req as any).rawBody;
    if (Buffer.isBuffer(raw)) {
      (req as any).rawBody = raw.toString('utf8');
    }
    next();
  }
}
