import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreditEngineService } from '../credit-engine.service';

@Injectable()
export class CreditGuard implements CanActivate {
  constructor(
    private engine: CreditEngineService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    const cost = this.reflector.get<number>(
      'requiredCredits',
      context.getHandler(),
    );
    if (!cost) return true;
    try {
      const balance = await this.engine.getBalance(user.id);
      return BigInt(balance) >= BigInt(cost);
    } catch (err) {
      return false;
    }
  }
}
