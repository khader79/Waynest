import i18n from "@/i18n";

const isRecord = (value) => typeof value === "object" && value !== null;

const readAxiosErrorData = (error) => {
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

export const getApiErrorStatus = (error) => {
  if (!isRecord(error)) {
    return undefined;
  }

  const response = error.response;
  if (!isRecord(response)) {
    return undefined;
  }

  return typeof response.status === "number" ? response.status : undefined;
};

export const getApiErrorMessage = (error, fallbackMessage) => {
  const data = readAxiosErrorData(error);
  if (!data) {
    return fallbackMessage;
  }

  const rawMessage = data.message;
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : Array.isArray(rawMessage)
        ? rawMessage.join("\n")
        : fallbackMessage;
  const messageKey =
    typeof data.messageKey === "string" ? data.messageKey : undefined;

  if (messageKey) {
    return i18n.t(messageKey, { defaultValue: message });
  }
  return message;
};

/** Resolved message plus optional key from the API payload. */
export const getApiErrorDetails = (error, fallbackMessage) => {
  const data = readAxiosErrorData(error);
  if (!data) {
    return { message: fallbackMessage };
  }
  const rawMsg = data.message;
  const raw =
    typeof rawMsg === "string"
      ? rawMsg
      : Array.isArray(rawMsg)
        ? rawMsg.join("\n")
        : fallbackMessage;
  const messageKey =
    typeof data.messageKey === "string" ? data.messageKey : undefined;
  const message = messageKey
    ? i18n.t(messageKey, { defaultValue: raw })
    : raw;
  return messageKey ? { message, messageKey } : { message };
};

export const isApiTimeoutError = (error) => {
  if (!isRecord(error)) {
    return false;
  }

  return error.code === "ECONNABORTED";
};

export const isApiCanceledError = (error) => {
  if (!isRecord(error)) {
    return false;
  }

  if (
    error.code === "ERR_CANCELED" ||
    error.name === "CanceledError" ||
    error.name === "AbortError"
  ) {
    return true;
  }

  if (typeof error.message !== "string") {
    return false;
  }

  const msg = error.message.toLowerCase();
  return msg.includes("canceled") || msg.includes("aborted");
};
