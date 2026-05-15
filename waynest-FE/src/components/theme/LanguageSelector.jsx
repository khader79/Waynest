import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, applyLanguageToDocument } from "@/i18n";
import { FiChevronDown } from "react-icons/fi";
import "./LanguageSelector.css";

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = i18n.resolvedLanguage || i18n.language;

  useEffect(() => {
    applyLanguageToDocument(current);
  }, [current]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const select = async (code) => {
    try {
      await i18n.changeLanguage(code);
      applyLanguageToDocument(code);
    } catch (e) {
      console.warn("Failed to change language", e);
    } finally {
      setOpen(false);
    }
  };

  const lang =
    SUPPORTED_LANGUAGES.find((l) => l.code === (current || "en")) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <div className="lang-selector" ref={ref}>
      <button
        type="button"
        className="lang-btn"
        onClick={() => setOpen((s) => !s)}
        aria-label={t("navbar.changeLanguage", "Change language")}>
        <span className="lang-flag" aria-hidden>
          {lang.flag}
        </span>
        <span className="lang-code">{lang.code.toUpperCase()}</span>
        <FiChevronDown className={`lang-chevron ${open ? "is-open" : ""}`} />
      </button>

      {open && (
        <div className="lang-dropdown">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className="lang-item"
              onClick={() => select(l.code)}>
              <span className="lang-flag" aria-hidden>
                {l.flag}
              </span>
              <span className="lang-name">{l.nativeName || l.name}</span>
              <span className="lang-code">{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
