import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SubscriptionsService } from 'src/modules/subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subs: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      'requiredFeature',
      context.getHandler(),
    );

    // No feature required -> allow
    if (!requiredFeature) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: any }>();

    // If request has no authenticated user, allow (keep anonymous flow intact)
    if (!req.user || !req.user.sub) return true;

    const userId = req.user.sub as string;
    const sub = await this.subs.getActiveSubscriptionForUser(userId);

    if (!sub || !sub.plan) {
      throw new HttpException(
        {
          message: 'Feature requires active subscription',
          code: 'upgrade_required',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const plan = sub.plan as any;

    // If plan explicitly contains the feature and it's truthy, allow
    if (plan.features && plan.features[requiredFeature]) return true;

    // If plan declares audience and user's role is present, allow
    const audience = plan.features?.audience;
    if (Array.isArray(audience) && req.user.role) {
      if (audience.includes(req.user.role)) return true;
    }

    throw new HttpException(
      {
        message: 'Feature not available on your plan',
        code: 'feature_forbidden',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
