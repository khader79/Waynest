import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (req.headers['stripe-signature']) {
      (req as any).rawBody = '';
      req.on('data', (chunk: Buffer) => {
        (req as any).rawBody += chunk.toString();
      });
      req.on('end', () => next());
    } else {
      next();
    }
  }
}
