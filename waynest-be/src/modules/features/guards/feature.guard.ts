import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesService } from '../features.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private features: FeaturesService,
    private subs: SubscriptionsService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    const requiredFeature = this.reflector.get<string>(
      'requiredFeature',
      context.getHandler(),
    );
    if (!requiredFeature) return true;
    const sub = await this.subs.getActiveSubscriptionForUser(user.id);
    const planFeatures = sub?.plan?.features;
    return this.features.isFeatureEnabled(
      user.id,
      requiredFeature,
      planFeatures,
    );
  }
}
