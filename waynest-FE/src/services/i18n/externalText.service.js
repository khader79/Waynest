const CACHE_STORAGE_KEY = "waynest:external-text:v1";
const cache = new Map();

let storageLoaded = false;
let saveTimer = null;

const normalizeLanguage = (language) => {
  const value =
    typeof language === "string" ? language.trim().toLowerCase() : "";
  if (!value) {
    return "en";
  }
  return value.split("-")[0] || "en";
};

const normalizeText = (text) => (typeof text === "string" ? text.trim() : "");

const buildKey = (text, language) =>
  `${normalizeLanguage(language)}:${normalizeText(text)}`;

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const loadCacheFromStorage = () => {
  if (storageLoaded || !canUseStorage()) {
    return;
  }

  storageLoaded = true;

  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        cache.set(key, value);
      }
    });
  } catch {
    // Ignore broken storage payloads and proceed with in-memory cache.
  }
};

const scheduleCacheSave = () => {
  if (!canUseStorage()) {
    return;
  }

  if (saveTimer) {
    window.clearTimeout(saveTimer);
  }

  saveTimer = window.setTimeout(() => {
    saveTimer = null;

    try {
      const payload = Object.fromEntries(cache.entries());
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota and privacy-mode failures.
    }
  }, 150);
};

const getCachedTranslation = (text, language) => {
  loadCacheFromStorage();
  return cache.get(buildKey(text, language));
};

const setCachedTranslation = (text, language, value) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return;
  }

  cache.set(buildKey(text, language), normalizedValue);
  scheduleCacheSave();
};

const resolveApiEndpoint = () => {
  const endpoint = import.meta.env.VITE_AI_TRANSLATE_ENDPOINT;
  return typeof endpoint === "string" ? endpoint.trim() : "";
};

const resolveLibreTranslateEndpoint = () => {
  const endpoint = import.meta.env.VITE_LIBRE_TRANSLATE_ENDPOINT;
  return typeof endpoint === "string" && endpoint.trim()
    ? endpoint.trim()
    : "https://translate.argosopentech.com/translate";
};

const getApiKey = () => {
  const key = import.meta.env.VITE_AI_TRANSLATE_API_KEY;
  return typeof key === "string" ? key.trim() : "";
};

const shouldSkipTranslation = (text, language) => {
  const normalizedText = normalizeText(text);
  const normalizedLanguage = normalizeLanguage(language);

  if (!normalizedText) {
    return true;
  }

  if (
    normalizedText.startsWith("@") ||
    normalizedText.startsWith("#") ||
    /^https?:\/\//i.test(normalizedText) ||
    /^www\./i.test(normalizedText) ||
    /^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(normalizedText) ||
    /^[A-Za-z0-9-]+\.[A-Za-z]{2,}$/i.test(normalizedText) ||
    (/^[a-z0-9._-]{2,}$/i.test(normalizedText) &&
      /[0-9_.-]/.test(normalizedText))
  ) {
    return true;
  }

  return normalizedLanguage === "en";
};

const decodeGooglePayload = (payload) => {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
    return "";
  }

  return payload[0]
    .map((part) => (Array.isArray(part) ? part[0] : ""))
    .filter((part) => typeof part === "string" && part.trim())
    .join("")
    .trim();
};

const requestViaConfiguredEndpoint = async (text, language) => {
  const endpoint = resolveApiEndpoint();
  if (!endpoint) {
    return "";
  }

  const apiKey = getApiKey();
  const headers = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["x-api-key"] = apiKey;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      targetLang: language,
      sourceLang: "auto",
    }),
  });

  if (!response.ok) {
    return "";
  }

  const payload = await response.json();
  return normalizeText(pickTranslatedValue(payload));
};

const requestViaGoogleFallback = async (text, language) => {
  const query = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(language)}&dt=t&q=${query}`;
  const response = await fetch(url);
  if (!response.ok) {
    return "";
  }
  const payload = await response.json();
  return decodeGooglePayload(payload);
};

const requestViaLibreTranslateFallback = async (text, language) => {
  const endpoint = resolveLibreTranslateEndpoint();
  if (!endpoint) {
    return "";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: text,
      source: "auto",
      target: language,
      format: "text",
    }),
  });

  if (!response.ok) {
    return "";
  }

  const payload = await response.json();
  return normalizeText(payload?.translatedText);
};

const pickTranslatedValue = (payload) => {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if (typeof payload.translatedText === "string") {
    return payload.translatedText;
  }

  if (typeof payload.translation === "string") {
    return payload.translation;
  }

  if (typeof payload.result === "string") {
    return payload.result;
  }

  if (typeof payload.text === "string") {
    return payload.text;
  }

  return "";
};

export const getLocalizedField = (record, fieldName, language) => {
  if (!record || typeof record !== "object") {
    return "";
  }

  const lang = normalizeLanguage(language);
  const pascalLang = `${lang.charAt(0).toUpperCase()}${lang.slice(1)}`;
  const possibleFields = [
    `${fieldName}${pascalLang}`,
    `${fieldName}_${lang}`,
    `${fieldName}${lang.toUpperCase()}`,
    fieldName,
  ];

  for (const candidate of possibleFields) {
    const value = record[candidate];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const translations = record.translations;
  if (translations && typeof translations === "object") {
    const langPack = translations[lang];
    if (langPack && typeof langPack === "object") {
      const value = langPack[fieldName];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "";
};

export const translateExternalText = async (text, language) => {
  if (shouldSkipTranslation(text, language)) {
    return normalizeText(text);
  }

  const normalizedText = normalizeText(text);
  const normalizedLanguage = normalizeLanguage(language);

  const cached = getCachedTranslation(normalizedText, normalizedLanguage);
  if (cached) {
    return cached;
  }

  try {
    let translated = "";

    translated = await requestViaConfiguredEndpoint(
      normalizedText,
      normalizedLanguage,
    );

    if (!translated) {
      translated = await requestViaGoogleFallback(
        normalizedText,
        normalizedLanguage,
      );
    }

    if (!translated) {
      translated = await requestViaLibreTranslateFallback(
        normalizedText,
        normalizedLanguage,
      );
    }

    if (!translated) {
      return normalizedText;
    }

    setCachedTranslation(normalizedText, normalizedLanguage, translated);
    return translated;
  } catch {
    return normalizedText;
  }
};

export const translateExternalBatch = async (values, language) => {
  const normalizedLanguage = normalizeLanguage(language);
  const unique = Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  );

  if (unique.length === 0 || normalizedLanguage === "en") {
    return new Map(unique.map((value) => [value, value]));
  }

  const translated = await Promise.all(
    unique.map(async (value) => [
      value,
      await translateExternalText(value, normalizedLanguage),
    ]),
  );

  return new Map(translated);
};

export const localizeCountryByCode = (
  countryCode,
  language,
  fallbackName = "",
) => {
  const code =
    typeof countryCode === "string" ? countryCode.trim().toUpperCase() : "";
  if (!code || code.length !== 2) {
    return normalizeText(fallbackName);
  }

  try {
    const formatter = new Intl.DisplayNames([normalizeLanguage(language)], {
      type: "region",
    });
    const localized = formatter.of(code);
    if (typeof localized === "string" && localized.trim()) {
      return localized.trim();
    }
  } catch {
    // Fallback handled below.
  }

  return normalizeText(fallbackName) || code;
};
