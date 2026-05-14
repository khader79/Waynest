import { useTranslation } from "react-i18next";
import { HiChevronDown } from "react-icons/hi";
import {
  getLanguageByCode,
  getLocalizedLanguageName,
} from "@/i18n";

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");

export const LanguageSwitcher = ({
  currentLanguageCode,
  languages,
  onSelect,
  onToggle,
  open,
}) => {
  const { t } = useTranslation();
  const currentLanguage =
    getLanguageByCode(currentLanguageCode) ?? languages?.[0] ?? null;
  const currentLanguageName = getLocalizedLanguageName(currentLanguage, t);

  return (
    <div className="language-dropdown">
      <button
        type="button"
        className="language-dropdown__button language-dropdown__button--compact"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("navbar.language", {
          defaultValue: "Language",
        })}>
        <span className="language-dropdown__flag" aria-hidden>
          {currentLanguage?.flag ?? "🌐"}
        </span>
        <span className="language-dropdown__label">
          {currentLanguageName || currentLanguageCode}
        </span>
        <HiChevronDown aria-hidden />
      </button>
      {open ? (
        <ul className="language-dropdown__menu" role="listbox">
          {(languages ?? []).map((language) => (
            <li key={language.code}>
              <button
                type="button"
                className={joinClassNames(
                  "language-dropdown__option",
                  language.code === currentLanguageCode && "active",
                )}
                role="option"
                aria-selected={language.code === currentLanguageCode}
                onClick={() => onSelect(language.code)}>
                <span className="language-dropdown__flag" aria-hidden>
                  {language.flag}
                </span>
                {getLocalizedLanguageName(language, t)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default LanguageSwitcher;
