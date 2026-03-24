import i18n from "@/core/i18n";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readAxiosErrorData = (error: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }
  const response = error.response;
  if (!isRecord(response)) {
    return undefined;
  }
  const data = response.data;
  return isRecord(data) ? data : undefined;
};

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
  const data = readAxiosErrorData(error);
  if (!data) {
    return fallbackMessage;
  }

  const message =
    typeof data.message === "string" ? data.message : fallbackMessage;
  const messageKey =
    typeof data.messageKey === "string" ? data.messageKey : undefined;

  if (messageKey) {
    return i18n.t(messageKey, { ns: "errors", defaultValue: message });
  }
  return message;
};

/** Resolved message plus optional key from the API payload. */
export const getApiErrorDetails = (
  error: unknown,
  fallbackMessage: string,
): { message: string; messageKey?: string } => {
  const data = readAxiosErrorData(error);
  if (!data) {
    return { message: fallbackMessage };
  }
  const raw =
    typeof data.message === "string" ? data.message : fallbackMessage;
  const messageKey =
    typeof data.messageKey === "string" ? data.messageKey : undefined;
  const message = messageKey
    ? i18n.t(messageKey, { ns: "errors", defaultValue: raw })
    : raw;
  return messageKey ? { message, messageKey } : { message };
};

export const isApiTimeoutError = (error: unknown) => {
  if (!isRecord(error)) {
    return false;
  }

  return error.code === "ECONNABORTED";
};
