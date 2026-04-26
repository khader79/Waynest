import { get } from "@/api/request";

export const getCitiesList = async () => {
  return get("/cities");
};

export const getAllCitiesList = async (search = "") => {
  return get("/cities/all", { params: { search } });
};
