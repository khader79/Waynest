import { get, postJson, postNoBody } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchPlans = async () => get(ROUTES.billing.plans);

export const fetchMySubscription = async () =>
  get(ROUTES.billing.mySubscription);

export const fetchMyWallet = async () => get(ROUTES.billing.myWallet);

export const fetchMyTransactions = async () =>
  get(ROUTES.billing.myTransactions);

export const upgradePlan = async (planId) =>
  postJson(ROUTES.billing.upgrade, { planId });

export const downgradePlan = async (planId) =>
  postJson(ROUTES.billing.downgrade, { planId });

export const cancelSubscription = async () =>
  postNoBody(ROUTES.billing.cancel);

export const reactivateSubscription = async () =>
  postNoBody(ROUTES.billing.reactivate);

export const fetchBillingHistory = async () => get(ROUTES.billing.history);

export const createCheckoutSession = async (planId) =>
  postJson(ROUTES.billing.createCheckoutSession, { planId });
