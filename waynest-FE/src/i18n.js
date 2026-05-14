import i18n from "i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

export const DEFAULT_LANGUAGE = "en";

export const LANGUAGE_STORAGE_KEY = "i18nextLng";

export const SUPPORTED_LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
    flag: "🇺🇸",
  },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "🇸🇦" },
  { code: "he", name: "Hebrew", nativeName: "עברית", dir: "rtl", flag: "🇮🇱" },
  {
    code: "fr",
    name: "French",
    nativeName: "Français",
    dir: "ltr",
    flag: "🇫🇷",
  },
  {
    code: "ru",
    name: "Russian",
    nativeName: "Русский",
    dir: "ltr",
    flag: "🇷🇺",
  },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", dir: "ltr", flag: "🇹🇷" },
  {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    dir: "ltr",
    flag: "🇪🇸",
  },
  {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    dir: "ltr",
    flag: "🇩🇪",
  },
  {
    code: "zh",
    name: "Chinese",
    nativeName: "中文",
    dir: "ltr",
    flag: "🇨🇳",
  },
  {
    code: "ja",
    name: "Japanese",
    nativeName: "日本語",
    dir: "ltr",
    flag: "🇯🇵",
  },
  {
    code: "ko",
    name: "Korean",
    nativeName: "한국어",
    dir: "ltr",
    flag: "🇰🇷",
  },
  {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    dir: "ltr",
    flag: "🇮🇹",
  },
  {
    code: "pt",
    name: "Portuguese",
    nativeName: "Português",
    dir: "ltr",
    flag: "🇵🇹",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    dir: "ltr",
    flag: "🇮🇳",
  },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl", flag: "🇵🇰" },
];

export const RTL_LANGUAGE_CODES = new Set(
  SUPPORTED_LANGUAGES.filter((language) => language.dir === "rtl").map(
    (language) => language.code,
  ),
);

export const normalizeLanguageCode = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return DEFAULT_LANGUAGE;
  }

  const baseCode = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.some((language) => language.code === baseCode)
    ? baseCode
    : DEFAULT_LANGUAGE;
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),
    nonExplicitSupportedLngs: true,
    cleanCode: true,
    load: "languageOnly",
    defaultNS: "translation",
    ns: ["translation"],

    detection: {
      order: ["querystring", "cookie", "localStorage", "navigator", "htmlTag"],
      lookupQuerystring: "lang",
      lookupCookie: "i18next",
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage", "cookie"],
      excludeCacheFor: ["cimode"],
      htmlTag:
        typeof document !== "undefined" ? document.documentElement : undefined,
    },

    backend: {
      loadPath: "/locales/{{lng}}/translation.json",
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    returnNull: false,
    returnEmptyString: false,
  });

export const getLanguageByCode = (code) => {
  const normalizedCode = normalizeLanguageCode(code);
  return SUPPORTED_LANGUAGES.find(
    (language) => language.code === normalizedCode,
  );
};

export const getLocalizedLanguageName = (language, translate) => {
  if (!language) {
    return "";
  }

  const fallbackName = language.name ?? language.nativeName ?? language.code;
  if (typeof translate !== "function") {
    return fallbackName;
  }

  return translate(`languages.${language.code}`, {
    defaultValue: fallbackName,
  });
};

export const getLanguageDir = (lang) => {
  return RTL_LANGUAGE_CODES.has(normalizeLanguageCode(lang)) ? "rtl" : "ltr";
};

export const isRtlLanguage = (lang) => getLanguageDir(lang) === "rtl";

export const applyLanguageToDocument = (lang) => {
  if (typeof document === "undefined") {
    return false;
  }

  const normalized = normalizeLanguageCode(lang);
  const direction = getLanguageDir(normalized);
  document.documentElement.setAttribute("lang", normalized);
  document.documentElement.setAttribute("dir", direction);
  return direction === "rtl";
};

export const getCurrentLanguage = () => {
  return normalizeLanguageCode(
    i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE,
  );
};

export default i18n;
