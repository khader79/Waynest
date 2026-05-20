import client from "@/api/client";

const unwrap = async (request) => {
  // Emit a global request start/end so the app can show a loading indicator
  try {
    if (typeof window !== "undefined" && window?.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("global:request:start"));
    }
  } catch {}

  try {
    const response = await request;
    return response.data;
  } finally {
    try {
      if (typeof window !== "undefined" && window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent("global:request:end"));
      }
    } catch {}
  }
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
