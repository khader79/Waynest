import apiClient from "./apiClient";

export const get = async (path: string) => {
  try {
    const res = await apiClient.get(path);
    return res.data;
  } catch (error: any) {
    throw new error(error);
  }
};

export const post = async (
  path: string,
  identifier: string,
  password: string,
) => {
  try {
    const res = await apiClient.post(path, {
      identifier,
      password,
    });
    return res.data;
  } catch (error: any) {
    throw error;
  }
};
