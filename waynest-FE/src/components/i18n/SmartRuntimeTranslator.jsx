import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getLanguageDir, getLanguageByCode, SUPPORTED_LANGUAGES } from "@/i18n";
import { translateExternalBatch } from "@/services/i18n/externalText.service";

const TEXT_ATTRS = ["placeholder", "title", "aria-label"];
const USER_CONTENT_SELECTOR = [
  "[data-user-content='true']",
  "[data-no-auto-translate='true']",
  "[class*='username']",
  "[class*='user-name']",
  "[class*='display-name']",
  "[class*='author']",
  "[class*='handle']",
  "[class*='avatar']",
  "[class*='profile']",
  "[class*='post']",
  "[class*='comment']",
  "[class*='message']",
  "[class*='chat']",
  "[class*='feed']",
  "[class*='story']",
  "[href^='/u/']",
  "[href*='/profile']",
  "time",
  "[datetime]",
].join(", ");

const originalTextNodes = new WeakMap();
const originalAttrValues = new WeakMap();

const normalizeLanguage = (language) => {
  if (typeof language !== "string") {
    return "en";
  }
  return language.trim().toLowerCase().split("-")[0] || "en";
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const isTranslatable = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return false;
  }

  // Skip values that are almost purely numeric/symbolic.
  if (!/[\p{L}]/u.test(text)) {
    return false;
  }

  return true;
};

const isLikelyIdentifier = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return true;
  }

  if (text.startsWith("@") || text.startsWith("#")) {
    return true;
  }

  if (/^https?:\/\//i.test(text) || /^www\./i.test(text)) {
    return true;
  }

  if (/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/i.test(text)) {
    return true;
  }

  if (/^[A-Za-z0-9-]+\.[A-Za-z]{2,}$/i.test(text)) {
    return true;
  }

  if (/^[a-z0-9._-]{2,}$/i.test(text) && /[0-9_.-]/.test(text)) {
    return true;
  }

  return false;
};

const shouldSkipTextForElement = (text, element) => {
  if (!element || !(element instanceof Element)) {
    return true;
  }

  if (element.closest("[data-force-auto-translate='true']")) {
    return false;
  }

  if (element.closest(USER_CONTENT_SELECTOR)) {
    return true;
  }

  if (isLikelyIdentifier(text)) {
    return true;
  }

  return false;
};

const shouldSkipElement = (element) => {
  if (!(element instanceof Element)) {
    return true;
  }

  if (element.closest("[data-no-auto-translate='true']")) {
    return true;
  }

  if (
    element.closest(
      "script, style, noscript, code, pre, textarea, input, select, option",
    )
  ) {
    return true;
  }

  if (element.closest("[contenteditable='true']")) {
    return true;
  }

  return false;
};

const getLeadingWhitespace = (value) => {
  const match = value.match(/^\s+/u);
  return match ? match[0] : "";
};

const getTrailingWhitespace = (value) => {
  const match = value.match(/\s+$/u);
  return match ? match[0] : "";
};

export function SmartRuntimeTranslator() {
  const { i18n } = useTranslation();
  const scheduledRef = useRef(0);
  const inFlightRef = useRef(false);
  const language = normalizeLanguage(i18n.language);

  const languageMeta = useMemo(
    () =>
      getLanguageByCode(language) ||
      SUPPORTED_LANGUAGES.find((item) => item.code === "en") ||
      SUPPORTED_LANGUAGES[0],
    [language],
  );

  useEffect(() => {
    const dir = getLanguageDir(languageMeta?.code || "en");
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", languageMeta?.code || "en");
  }, [languageMeta]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const translatePage = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      try {
        const values = new Set();
        const textTargets = [];
        const attrTargets = [];

        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              const parent = node.parentElement;
              if (!parent || shouldSkipElement(parent)) {
                return NodeFilter.FILTER_REJECT;
              }

              if (!isTranslatable(node.nodeValue || "")) {
                return NodeFilter.FILTER_REJECT;
              }

              if (shouldSkipTextForElement(node.nodeValue || "", parent)) {
                return NodeFilter.FILTER_REJECT;
              }

              return NodeFilter.FILTER_ACCEPT;
            },
          },
        );

        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!originalTextNodes.has(node)) {
            originalTextNodes.set(node, node.nodeValue || "");
          }

          const original = originalTextNodes.get(node) || "";
          const base = normalizeText(original);
          if (!base) {
            continue;
          }

          values.add(base);
          textTargets.push({ node, original });
        }

        const elements = document.body.querySelectorAll("*");
        elements.forEach((element) => {
          if (shouldSkipElement(element)) {
            return;
          }

          TEXT_ATTRS.forEach((attr) => {
            const currentValue = element.getAttribute(attr);
            if (!isTranslatable(currentValue || "")) {
              return;
            }

            if (shouldSkipTextForElement(currentValue || "", element)) {
              return;
            }

            let originalMap = originalAttrValues.get(element);
            if (!originalMap) {
              originalMap = new Map();
              originalAttrValues.set(element, originalMap);
            }

            if (!originalMap.has(attr)) {
              originalMap.set(attr, currentValue || "");
            }

            const original = originalMap.get(attr) || "";
            const base = normalizeText(original);
            if (!base) {
              return;
            }

            values.add(base);
            attrTargets.push({ element, attr, original });
          });
        });

        if (values.size === 0) {
          return;
        }

        const translatedMap = await translateExternalBatch(
          Array.from(values),
          language,
        );

        textTargets.forEach(({ node, original }) => {
          const base = normalizeText(original);
          if (!base) {
            return;
          }

          const translated = translatedMap.get(base) || base;
          const nextValue = `${getLeadingWhitespace(original)}${translated}${getTrailingWhitespace(original)}`;
          if (node.nodeValue !== nextValue) {
            node.nodeValue = nextValue;
          }
        });

        attrTargets.forEach(({ element, attr, original }) => {
          const base = normalizeText(original);
          if (!base) {
            return;
          }

          const translated = translatedMap.get(base) || base;
          const nextValue = `${getLeadingWhitespace(original)}${translated}${getTrailingWhitespace(original)}`;
          if (element.getAttribute(attr) !== nextValue) {
            element.setAttribute(attr, nextValue);
          }
        });
      } finally {
        inFlightRef.current = false;
      }
    };

    const scheduleTranslate = () => {
      if (scheduledRef.current) {
        window.clearTimeout(scheduledRef.current);
      }
      scheduledRef.current = window.setTimeout(() => {
        scheduledRef.current = 0;
        void translatePage();
      }, 120);
    };

    const observer = new MutationObserver(() => {
      scheduleTranslate();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRS,
    });

    scheduleTranslate();

    return () => {
      if (scheduledRef.current) {
        window.clearTimeout(scheduledRef.current);
        scheduledRef.current = 0;
      }
      observer.disconnect();
    };
  }, [language]);

  return null;
}

export default SmartRuntimeTranslator;
