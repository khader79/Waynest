import client from "@/api/client";

const unwrap = async (request) => {
  const response = await request;
  return response.data;
};

export const get = (url, config = {}) => unwrap(client.get(url, config));

export const postJson = (url, payload = {}, config = {}) =>
  unwrap(client.post(url, payload, config));

export const postFormData = (url, formData, config = {}) =>
  unwrap(
    client.post(url, formData, {
      ...config,
      headers: {
        ...(config.headers ?? {}),
        "Content-Type": "multipart/form-data",
      },
    }),
  );

export const putJson = (url, payload = {}, config = {}) =>
  unwrap(client.put(url, payload, config));

export const patch = (url, payload = {}, config = {}) =>
  unwrap(client.patch(url, payload, config));

export const del = (url, payload, config = {}) =>
  unwrap(client.delete(url, { ...config, data: payload }));

export const postNoBody = (url, config = {}) =>
  unwrap(client.post(url, undefined, config));
