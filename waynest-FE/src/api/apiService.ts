import apiClient from "./apiClient";

export const get = async (path: any) => {
  const res = await apiClient.get(path);
  return res.data;
};

export const post = async (path: any, identifier: any, password: any) => {
  const res = await apiClient.post(path, {
    identifier,
    password,
  });
  return res.data;
};

export const postJson = async (path: any, body: any) => {
  const res = await apiClient.post(path, body);
  return res.data;
};

export const patch = async (path: any, body: any) => {
  const res = await apiClient.patch(path, body);
  return res.data;
};

export const del = async (path: any, body?: any) => {
  const res = await apiClient.delete(path, body ? { data: body } : undefined);
  return res.data;
};

export const postNoBody = async (path: any) => {
  const res = await apiClient.post(path);
  return res.data;
};
