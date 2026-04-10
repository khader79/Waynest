import defaultFormat, {
  convertAmount,
  RATES_TO_ILS,
  loadRemoteRates,
} from "../src/utils/currency.js";

console.log("RATES_TO_ILS snapshot:", RATES_TO_ILS);

const a = 100;
const usdToIls = convertAmount(a, "USD", "ILS");
const ilsToUsd = convertAmount(usdToIls, "ILS", "USD");

console.log(`${a} USD -> ILS = ${usdToIls}`);
console.log(`${usdToIls} ILS -> USD = ${ilsToUsd}`);

console.log("Intl format examples:");
console.log("100 USD formatted:", defaultFormat(100, "USD"));
console.log("360 ILS formatted:", defaultFormat(360, "ILS"));

(async () => {
  try {
    console.log("Attempting to load remote rates (may be slow)");
    await loadRemoteRates("ILS");
    console.log("Updated RATES_TO_ILS:", RATES_TO_ILS);
  } catch (err) {
    console.error("Remote rates failed", err);
  }
})();
