import { del, get, patch, postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const fetchTripExpenses = async (tripPlanId) =>
  get(ROUTES.expenses.list(tripPlanId));

export const createTripExpense = async (tripPlanId, payload) =>
  postJson(ROUTES.expenses.create(tripPlanId), payload);

export const deleteTripExpense = async (expenseId) =>
  del(ROUTES.expenses.remove(expenseId));

export const toggleExpenseSettled = async (expenseId) =>
  patch(ROUTES.expenses.settle(expenseId), {});
