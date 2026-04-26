import { useTranslation } from "react-i18next";

import { useGeoTablesData } from "@/hooks/user/useGeoTablesData";
import "./GeoTables.css";

const GeoTables = () => {
  const { t } = useTranslation();
  const { cities, countries, currencies, error, loading } = useGeoTablesData();

  return (
    <section className="geo">
      <header className="geo-header">
        <p className="geo-kicker">{t("geo.eyebrow")}</p>
        <h1 className="geo-title">{t("geo.title")}</h1>
        <p className="geo-subtitle">{t("geo.subtitle")}</p>
      </header>

      <div className="geo-panels">
        <div className="geo-panel">
          <div className="geo-panel-header">
            <h2>{t("geo.countries")}</h2>
            <span className="geo-count">
              {countries.length} {t("geo.items")}
            </span>
          </div>
          {loading && <div className="geo-loading">{t("geo.loading")}</div>}
          {error && (
            <div className="geo-error">{t("geo.errors.loadFailed")}</div>
          )}
          {!loading && !error && (
            <div className="geo-table-wrapper">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>{t("geo.headers.name")}</th>
                    <th>{t("geo.headers.alpha2")}</th>
                    <th>{t("geo.headers.alpha3")}</th>
                    <th>{t("geo.headers.region")}</th>
                    <th>{t("geo.headers.capital")}</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((country) => (
                    <tr key={country.id}>
                      <td>{country.name}</td>
                      <td>{country.alpha2Code}</td>
                      <td>{country.alpha3Code}</td>
                      <td>{country.region || "-"}</td>
                      <td>{country.capital || "-"}</td>
                    </tr>
                  ))}
                  {countries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="geo-empty">
                        {t("geo.noCountries")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="geo-panel">
          <div className="geo-panel-header">
            <h2>{t("geo.cities")}</h2>
            <span className="geo-count">
              {cities.length} {t("geo.items")}
            </span>
          </div>
          {loading && <div className="geo-loading">{t("geo.loading")}</div>}
          {error && (
            <div className="geo-error">{t("geo.errors.loadFailed")}</div>
          )}
          {!loading && !error && (
            <div className="geo-table-wrapper">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>{t("geo.headers.name")}</th>
                    <th>{t("geo.headers.state")}</th>
                    <th>{t("geo.headers.population")}</th>
                    <th>{t("geo.headers.latitude")}</th>
                    <th>{t("geo.headers.longitude")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city) => (
                    <tr key={city.id}>
                      <td>{city.name}</td>
                      <td>{city.stateName || "-"}</td>
                      <td>{city.population ?? "-"}</td>
                      <td>{city.latitude ?? "-"}</td>
                      <td>{city.longitude ?? "-"}</td>
                    </tr>
                  ))}
                  {cities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="geo-empty">
                        {t("geo.noCities")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="geo-panel">
          <div className="geo-panel-header">
            <h2>{t("geo.currencies")}</h2>
            <span className="geo-count">
              {currencies.length} {t("geo.items")}
            </span>
          </div>
          {loading && <div className="geo-loading">{t("geo.loading")}</div>}
          {error && (
            <div className="geo-error">{t("geo.errors.loadFailed")}</div>
          )}
          {!loading && !error && (
            <div className="geo-table-wrapper">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>{t("geo.headers.code")}</th>
                    <th>{t("geo.headers.name")}</th>
                    <th>{t("geo.headers.fractionSize")}</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency) => (
                    <tr key={currency.id}>
                      <td>{currency.code}</td>
                      <td>{currency.name}</td>
                      <td>{currency.fractionSize ?? "-"}</td>
                    </tr>
                  ))}
                  {currencies.length === 0 && (
                    <tr>
                      <td colSpan={3} className="geo-empty">
                        {t("geo.noCurrencies")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default GeoTables;
