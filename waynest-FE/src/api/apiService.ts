import apiClient from "./apiClient";

export const get = async (path: string) => {
  try {
    const res = await apiClient.get(path);
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

export const postJson = async (path: string, body: any) => {
  try {
    const res = await apiClient.post(path, body);
    return res.data;
  } catch (error: any) {
    throw error;
  }
};

export const patch = async (path: string, body: any) => {
  try {
    const res = await apiClient.patch(path, body);
    return res.data;
  } catch (error: any) {
    throw error;
  }
};

export const del = async (path: string) => {
  try {
    const res = await apiClient.delete(path);
    return res.data;
  } catch (error: any) {
    throw error;
  }
};

export const postNoBody = async (path: string) => {
  try {
    const res = await apiClient.post(path);
    return res.data;
  } catch (error: any) {
    throw error;
  }
};
