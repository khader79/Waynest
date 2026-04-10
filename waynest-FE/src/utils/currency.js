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

export const formatCurrency = (value, currency = "ILS") => {
  try {
    return `${Number(value).toFixed(2)} ${currency}`;
  } catch {
    return `0.00 ${currency}`;
  }
};

// Fetch remote rates (client-side) and update in-memory rates map.
// Uses exchangerate.host (no API key) and expects to be called from browser code.
export const loadRemoteRates = async (base = "ILS") => {
  try {
    const resp = await fetch(
      `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`,
    );
    if (!resp.ok) return;
    const payload = await resp.json();
    if (!payload || !payload.rates) return;

    // payload.rates maps target currency -> amount of target per 1 base
    // We want RATES_TO_ILS[c] = ILS per 1 unit of c. If base === 'ILS', payload.rates[c]
    // is c per 1 ILS, so invert it: ILS per 1 c = 1 / payload.rates[c]
    if (base === "ILS") {
      Object.entries(payload.rates).forEach(([code, rate]) => {
        const r = Number(rate);
        if (Number.isFinite(r) && r > 0) {
          RATES_TO_ILS[code] = 1 / r;
        }
      });
    } else {
      // If base is not ILS, we still can compute ILS per unit of target by
      // first getting ILS-per-base (if known) or skipping.
      const ilsPerBase = RATES_TO_ILS[base] ?? null;
      Object.entries(payload.rates).forEach(([code, rate]) => {
        const r = Number(rate);
        if (!Number.isFinite(r) || r <= 0) return;
        if (ilsPerBase) {
          // rate = target per 1 base. So 1 target = (1 / rate) base. Then multiply by ilsPerBase
          RATES_TO_ILS[code] = (1 / r) * ilsPerBase;
        }
      });
    }
  } catch {
    // ignore network errors silently; conversion will fall back to known static rates
  }
};
