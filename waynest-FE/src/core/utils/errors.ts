const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getApiErrorStatus = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  const response = error.response;
  if (!isRecord(response)) {
    return undefined;
  }

  return typeof response.status === "number" ? response.status : undefined;
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (!isRecord(error)) {
    return fallbackMessage;
  }

  const response = error.response;
  if (!isRecord(response)) {
    return fallbackMessage;
  }

  const data = response.data;
  if (!isRecord(data)) {
    return fallbackMessage;
  }

  return typeof data.message === "string" ? data.message : fallbackMessage;
};

export const isApiTimeoutError = (error: unknown) => {
  if (!isRecord(error)) {
    return false;
  }

  return error.code === "ECONNABORTED";
};
