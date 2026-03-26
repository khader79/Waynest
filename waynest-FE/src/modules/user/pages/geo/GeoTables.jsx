import { useGeoTablesData } from "../../hooks/useGeoTablesData";
import "./GeoTables.css";

const GeoTables = () => {
  const { cities, countries, currencies, error, loading } = useGeoTablesData();

  return (
    <section className="geo">
      <header className="geo-header">
        <p className="geo-kicker">Explore</p>
        <h1 className="geo-title">Countries, Cities & Currencies</h1>
        <p className="geo-subtitle">
          Browse the locations and currencies available in Waynest. Data is kept in sync with the
          admin panel CRUDs.
        </p>
      </header>

      <div className="geo-panels">
        <div className="geo-panel">
          <div className="geo-panel-header">
            <h2>Countries</h2>
            <span className="geo-count">{countries.length} items</span>
          </div>
          {loading && <div className="geo-loading">Loading...</div>}
          {error && <div className="geo-error">{error}</div>}
          {!loading && !error &&
          <div className="geo-table-wrapper">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Alpha 2</th>
                    <th>Alpha 3</th>
                    <th>Region</th>
                    <th>Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map((country) =>
                <tr key={country.id}>
                      <td>{country.name}</td>
                      <td>{country.alpha2Code}</td>
                      <td>{country.alpha3Code}</td>
                      <td>{country.region || "-"}</td>
                      <td>{country.capital || "-"}</td>
                    </tr>
                )}
                  {countries.length === 0 &&
                <tr>
                      <td colSpan={5} className="geo-empty">
                        No countries available.
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
          }
        </div>

        <div className="geo-panel">
          <div className="geo-panel-header">
            <h2>Cities</h2>
            <span className="geo-count">{cities.length} items</span>
          </div>
          {loading && <div className="geo-loading">Loading...</div>}
          {error && <div className="geo-error">{error}</div>}
          {!loading && !error &&
          <div className="geo-table-wrapper">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>State</th>
                    <th>Population</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {cities.map((city) =>
                <tr key={city.id}>
                      <td>{city.name}</td>
                      <td>{city.stateName || "-"}</td>
                      <td>{city.population ?? "-"}</td>
                      <td>{city.latitude ?? "-"}</td>
                      <td>{city.longitude ?? "-"}</td>
                    </tr>
                )}
                  {cities.length === 0 &&
                <tr>
                      <td colSpan={5} className="geo-empty">
                        No cities available.
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
          }
        </div>

        <div className="geo-panel">
          <div className="geo-panel-header">
            <h2>Currencies</h2>
            <span className="geo-count">{currencies.length} items</span>
          </div>
          {loading && <div className="geo-loading">Loading...</div>}
          {error && <div className="geo-error">{error}</div>}
          {!loading && !error &&
          <div className="geo-table-wrapper">
              <table className="geo-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Fraction Size</th>
                  </tr>
                </thead>
                <tbody>
                  {currencies.map((currency) =>
                <tr key={currency.id}>
                      <td>{currency.code}</td>
                      <td>{currency.name}</td>
                      <td>{currency.fractionSize ?? "-"}</td>
                    </tr>
                )}
                  {currencies.length === 0 &&
                <tr>
                      <td colSpan={3} className="geo-empty">
                        No currencies available.
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </section>);

};

export default GeoTables;