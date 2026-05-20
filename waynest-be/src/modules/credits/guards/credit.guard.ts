import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreditEngineService } from '../credit-engine.service';

@Injectable()
export class CreditGuard implements CanActivate {
  private readonly logger = new Logger(CreditGuard.name);

  constructor(
    private engine: CreditEngineService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    const cost = this.reflector.get<number>(
      'requiredCredits',
      context.getHandler(),
    );
    if (!cost) return true;
    try {
      const available = await this.engine.getAvailableBalance(user.id);
      if (BigInt(available) < BigInt(cost)) {
        this.logger.warn(
          `CreditGuard denied ${user.id}: need ${cost}, have ${available}`,
        );
        throw new ForbiddenException(
          `Insufficient credits. You need ${cost} credits but only have ${available}. Upgrade your plan.`,
        );
      }
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.error(
        `CreditGuard error for ${user?.id}: ${(err as Error).message}`,
      );
      throw new ForbiddenException('Unable to verify credit balance');
    }
  }
}
