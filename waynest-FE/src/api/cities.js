import { get } from "@/api/request";
import { ROUTES } from "@/api/routes";

export const getCitiesList = async () => {
  return get("/cities");
};
