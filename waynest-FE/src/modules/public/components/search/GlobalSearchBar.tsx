import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./GlobalSearchBar.css";

export const GlobalSearchBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) {
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setQ("");
  };

  return (
    <form className="global-search-bar" onSubmit={submit} role="search">
      <label className="global-search-bar__label" htmlFor="global-search-input">
        <span className="global-search-bar__label-text">
          {t("search.label", { defaultValue: "Search" })}
        </span>
      </label>
      <input
        id="global-search-input"
        className="global-search-bar__input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("search.placeholder", {
          defaultValue: "People, places, businesses…",
        })}
        autoComplete="off"
      />
      <button type="submit" className="global-search-bar__submit">
        {t("search.submit", { defaultValue: "Go" })}
      </button>
    </form>
  );
};
