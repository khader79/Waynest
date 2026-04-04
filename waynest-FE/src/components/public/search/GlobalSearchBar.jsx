import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import "./GlobalSearchBar.css";

export const GlobalSearchBar = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (event) => {
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
        placeholder={t(
          isAuthenticated ? "search.placeholder" : "search.placeholderGuest",
          {
            defaultValue: isAuthenticated
              ? "People, places, businesses…"
              : "Providers, places, events…",
          },
        )}
        autoComplete="off" />
      
      <button type="submit" className="global-search-bar__submit">
        {t("search.submit", { defaultValue: "Go" })}
      </button>
    </form>);

};