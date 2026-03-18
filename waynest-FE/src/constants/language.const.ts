import { t } from "i18next";

export type LanguageCode = "en" | "ar" | "ru" | "fr" | "tr";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export const getLanguages = (): LanguageOption[] => [
  { code: "en", label: t("languages.en") },
  { code: "ar", label: t("languages.ar") },
  { code: "ru", label: t("languages.ru") },
  { code: "fr", label: t("languages.fr") },
  { code: "tr", label: t("languages.tr") },
];

