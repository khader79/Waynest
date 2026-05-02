import { createContext, useContext, useEffect, useState } from "react";
import { fetchAllCurrencies } from "@/api/catalog";
import { loadRemoteRates } from "@/utils/currency";

const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    try {
      return localStorage.getItem("waynest-currency");
    } catch {
      // Local storage may be unavailable in restricted environments.
      return null;
    }
  });

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchAllCurrencies();
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (!active) return;
        setCurrencies(list);

        if (!selectedCurrency && list.length > 0) {
          const usd = list.find((c) => (c.code ?? c.iso) === "USD");
          const pick = usd ?? list[0];
          const code = pick?.code ?? pick?.iso ?? pick?.id ?? null;
          if (code) {
            setSelectedCurrency(code);
            try {
              localStorage.setItem("waynest-currency", code);
            } catch {
              // Ignore storage write failures.
            }
          }
        }
      } catch (err) {
        // Silently handle currency load failure
      } finally {
        if (active) setLoading(false);
      }
    })();

    // load remote exchange rates once (and refresh daily)
    let ratesActive = true;
    const refreshRates = async () => {
      try {
        await loadRemoteRates("ILS");
      } catch {
        // Keep stale rates when remote refresh fails.
      }
    };
    void refreshRates();
    const id = setInterval(
      () => {
        if (ratesActive) void refreshRates();
      },
      24 * 60 * 60 * 1000,
    ); // refresh every 24h
    return () => {
      active = false;
      ratesActive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    try {
      if (selectedCurrency)
        localStorage.setItem("waynest-currency", selectedCurrency);
      else localStorage.removeItem("waynest-currency");
    } catch {
      // Ignore storage write failures.
    }
  }, [selectedCurrency]);

  return (
    <CurrencyContext.Provider
      value={{ currencies, selectedCurrency, setSelectedCurrency, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
};

export default CurrencyContext;
