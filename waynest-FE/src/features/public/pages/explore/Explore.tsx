import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./Explore.css";

const Explore = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState("all");

  const categories = [
    { key: "all", label: t("explore.categories.all") },
    { key: "restaurant", label: t("explore.categories.restaurant") },
    { key: "cafe", label: t("explore.categories.cafe") },
    { key: "attraction", label: t("explore.categories.attraction") },
    { key: "museum", label: t("explore.categories.museum") },
    { key: "park", label: t("explore.categories.park") },
    { key: "historical", label: t("explore.categories.historical") },
  ];

  return (
    <div className="explore-page">
      <div className="hero-section">
        <h1>{t("explore.hero.title")}</h1>
        <p>{t("explore.hero.subtitle")}</p>
        <div className="search-box">
          <input type="text" placeholder={t("explore.hero.searchPlaceholder")} />
        </div>
      </div>

      <div className="filter-bar">
        {categories.map((cat) => (
          <button
            key={cat.key}
            className={active === cat.key ? "active" : ""}
            onClick={() => setActive(cat.key)}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid"></div>
    </div>
  );
};

export default Explore;
