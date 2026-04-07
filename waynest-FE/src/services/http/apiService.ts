import apiClient from "@/api/client";
import type { AxiosRequestConfig } from "axios";

export const get = async <TResponse = unknown>(path: string) => {
  const res = await apiClient.get(path);
  return res.data as TResponse;
};

export const postLogin = async <TResponse = unknown>(
  path: string,
  identifier: string,
  password: string,
) => {
  const res = await apiClient.post(path, {
    identifier,
    password,
  });
  return res.data as TResponse;
};

export const postJson = async <TResponse = unknown, TBody = unknown>(
  path: string,
  body: TBody,
) => {
  const res = await apiClient.post(path, body);
  return res.data as TResponse;
};

export const patch = async <TResponse = unknown, TBody = unknown>(
  path: string,
  body: TBody,
) => {
  const res = await apiClient.patch(path, body);
  return res.data as TResponse;
};

export const putJson = async <TResponse = unknown, TBody = unknown>(
  path: string,
  body: TBody,
) => {
  const res = await apiClient.put(path, body);
  return res.data as TResponse;
};

export const del = async <TResponse = unknown, TBody = unknown>(
  path: string,
  body?: TBody,
) => {
  const res = await apiClient.delete(path, body ? { data: body } : undefined);
  return res.data as TResponse;
};

export const postNoBody = async <TResponse = unknown>(path: string) => {
  const res = await apiClient.post(path);
  return res.data as TResponse;
};

export const postFormData = async <TResponse = unknown>(
  path: string,
  formData: FormData,
  config?: AxiosRequestConfig<FormData>,
) => {
  const res = await apiClient.post(path, formData, {
    ...config,
    headers: {
      ...(config?.headers ?? {}),
      "Content-Type": undefined,
    },
  });
  return res.data as TResponse;
};
