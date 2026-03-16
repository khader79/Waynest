import apiClient from "./apiClient";

export const get = async <T = unknown>(path: string): Promise<T> => {
  const res = await apiClient.get<T>(path);
  return res.data;
};

export const post = async <T = unknown>(
  path: string,
  identifier: string,
  password: string,
): Promise<T> => {
  const res = await apiClient.post<T>(path, {
    identifier,
    password,
  });
  return res.data;
};

export const postJson = async <T = unknown>(
  path: string,
  body: unknown,
): Promise<T> => {
  const res = await apiClient.post<T>(path, body);
  return res.data;
};

export const patch = async <T = unknown>(
  path: string,
  body: unknown,
): Promise<T> => {
  const res = await apiClient.patch<T>(path, body);
  return res.data;
};

export const del = async <T = unknown>(path: string): Promise<T> => {
  const res = await apiClient.delete<T>(path);
  return res.data;
};

export const postNoBody = async <T = unknown>(path: string): Promise<T> => {
  const res = await apiClient.post<T>(path);
  return res.data;
};
