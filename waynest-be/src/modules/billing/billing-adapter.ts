import { Injectable } from '@nestjs/common';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { CreditWallet } from '../credits/entities/credit-wallet.entity';

export const BILLING_ADAPTER = 'BILLING_ADAPTER';

export interface BillingProvider {
  name: string;
  createCheckoutSession(
    userId: string,
    planId: string,
  ): Promise<{ sessionUrl: string; sessionId: string }>;
  handleWebhook(
    payload: any,
  ): Promise<{ success: boolean; subscription?: any }>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
}

@Injectable()
export class StubBillingAdapter implements BillingProvider {
  name = 'stub';

  async createCheckoutSession(userId: string, planId: string) {
    return {
      sessionUrl: `https://example.com/checkout?user=${userId}&plan=${planId}`,
      sessionId: `session_stub_${Date.now()}`,
    };
  }

  async handleWebhook(payload: any) {
    console.log('Stub webhook received:', payload);
    return { success: true };
  }

  async cancelSubscription(providerSubscriptionId: string) {
    console.log('Stub cancel:', providerSubscriptionId);
  }
}
