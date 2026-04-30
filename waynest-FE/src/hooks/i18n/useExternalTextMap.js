import { useEffect, useMemo, useState } from "react";
import { translateExternalBatch } from "@/services/i18n/externalText.service";
import i18n from "@/i18n";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeLanguage = (language) => {
  const value =
    typeof language === "string" ? language.trim().toLowerCase() : "";
  if (!value) {
    return "en";
  }
  return value.split("-")[0] || "en";
};

export const useExternalTextMap = (texts, language) => {
  const normalizedLanguage = normalizeLanguage(language);

  const textPool = useMemo(
    () =>
      Array.from(
        new Set(
          (Array.isArray(texts) ? texts : [])
            .map((text) => normalizeText(text))
            .filter(Boolean),
        ),
      ),
    [texts],
  );

  const [translatedMap, setTranslatedMap] = useState(() => new Map());

  useEffect(() => {
    let active = true;

    if (textPool.length === 0 || normalizedLanguage === "en") {
      setTranslatedMap(new Map(textPool.map((text) => [text, text])));
      return () => {
        active = false;
      };
    }

    const load = async () => {
      const map = await translateExternalBatch(textPool, normalizedLanguage);
      if (!active) {
        return;
      }
      setTranslatedMap(map);
    };

    void load();

    return () => {
      active = false;
    };
  }, [normalizedLanguage, textPool]);

  return (value) => {
    const normalized = normalizeText(value);
    if (!normalized) {
      return "";
    }
    return translatedMap.get(normalized) || normalized;
  };
};
