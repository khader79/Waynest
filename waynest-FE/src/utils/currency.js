export function formatCurrency(amount, currencyCode, locale = undefined) {
  if (amount == null || currencyCode == null) return "";
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return String(amount);

  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (err) {
    // fallback: show code and value
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

export default formatCurrency;
// Simple currency utilities and static rates
// Rates are expressed as ILS per 1 unit of currency (ILS base = 1)
export const RATES_TO_ILS = {
  ILS: 1,
  USD: 3.6,
  EUR: 3.9,
  GBP: 4.6,
};

export const AVAILABLE_CURRENCIES = [
  { label: "ILS", value: "ILS" },
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
  { label: "GBP", value: "GBP" },
];

export const convertAmount = (amount, from = "ILS", to = "ILS") => {
  if (amount == null) return 0;
  const f = RATES_TO_ILS[from] ?? 1;
  const t = RATES_TO_ILS[to] ?? 1;
  const inIls = Number(amount) * f;
  const result = inIls / t;
  return Number.isFinite(result) ? result : 0;
};

// Note: the main `formatCurrency` function (with Intl formatting) is
// defined and exported as the default at the top of this file. We avoid
// redeclaring the same export name here.

// Fetch remote rates (client-side) and return updated rates map.
// Uses exchangerate.host (no API key) and expects to be called from browser code.
// Returns a new object instead of mutating shared state to avoid race conditions.
export const loadRemoteRates = async (base = "ILS") => {
  try {
    const resp = await fetch(
      `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`,
    );
    if (!resp.ok) return null;
    const payload = await resp.json();
    if (!payload || !payload.rates) return null;

    // Create a new rates object instead of mutating shared state
    const updatedRates = { ...RATES_TO_ILS };

    // payload.rates maps target currency -> amount of target per 1 base
    // We want rates[c] = ILS per 1 unit of c. If base === 'ILS', payload.rates[c]
    // is c per 1 ILS, so invert it: ILS per 1 c = 1 / payload.rates[c]
    if (base === "ILS") {
      Object.entries(payload.rates).forEach(([code, rate]) => {
        const r = Number(rate);
        if (Number.isFinite(r) && r > 0) {
          updatedRates[code] = 1 / r;
        }
      });
    } else {
      // If base is not ILS, we still can compute ILS per unit of target by
      // first getting ILS-per-base (if known) or skipping.
      const ilsPerBase = updatedRates[base] ?? null;
      Object.entries(payload.rates).forEach(([code, rate]) => {
        const r = Number(rate);
        if (!Number.isFinite(r) || r <= 0) return;
        if (ilsPerBase) {
          // rate = target per 1 base. So 1 target = (1 / rate) base. Then multiply by ilsPerBase
          updatedRates[code] = (1 / r) * ilsPerBase;
        }
      });
    }
    return updatedRates;
  } catch {
    // ignore network errors silently; conversion will fall back to known static rates
    return null;
  }
};
