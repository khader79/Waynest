import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./GuestFooter.css";

const LINKS = {
  discover: [
    { labelKey: "footer.explorePlaces", to: "/explore" },
    { labelKey: "footer.aiTripPlanner", to: "/plan" },
    { labelKey: "footer.destinations", to: "/destinations" },
    { labelKey: "footer.publicTrips", to: "/trips" },
  ],
  company: [
    { labelKey: "footer.aboutUs", to: "/about" },
    { labelKey: "footer.contact", to: "/contact" },
  ],
  account: [
    { labelKey: "footer.signUpFree", to: "/register" },
    { labelKey: "footer.logIn", to: "/login" },
    { labelKey: "footer.socialFeed", to: "/social" },
  ],
};

const GuestFooter = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="gf-root">
      <div className="gf-inner">
        <div className="gf-brand">
          <Link to="/" className="gf-logo">
            <img
              src="/images/waynest icon.svg"
              alt={t("footer.logoAlt", { defaultValue: "Waynest" })}
              className="gf-logo-img"
            />
            <span>{t("common.brandName")}</span>
          </Link>
          <p className="gf-tagline">{t("footer.tagline")}</p>
        </div>

        {Object.entries(LINKS).map(([group, items]) => (
          <div key={group} className="gf-col">
            <h4 className="gf-col-title">{t(`footer.${group}`)}</h4>
            <ul className="gf-col-list">
              {items.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="gf-link">
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="gf-bottom">
        <span>{t("footer.copyright", { year: currentYear })}</span>
        <span className="gf-bottom-sep">·</span>
        <span>{t("footer.builtForExplorers")}</span>
      </div>
    </footer>
  );
};

export default GuestFooter;
