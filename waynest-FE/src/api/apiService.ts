import apiClient from "./apiClient";

export const get = async (path: string, token?: string) => {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  try {
    const res = await apiClient.get(path, config);
    return res.data;
  } catch (error: any) {
    throw error;
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
