import { postJson } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const submitContactForm = async (payload) =>
  postJson(ROUTES.contact, payload);
