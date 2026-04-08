// import { localeBg } from "../locales/bg";
// import { localeBr } from "../locales/br";
// import { localeCl } from "../locales/cl";
// import { localeEg } from "../locales/eg";
// import { localeGr } from "../locales/gr";
// import { localeNl } from "../locales/nl";
import { localeEng } from "../locales/eng";

export const COUNTRIES = {
  // CL: localeCl,
  // BG: localeBg,
  // BR: localeBr,
  // EG: localeEg,
  // GR: localeGr,
  // NL: localeNl,
  ENG: localeEng,
};

const requestedCountry = import.meta.env.VITE_COUNTRY?.toUpperCase?.() ?? "ENG";

export const ACTIVE_COUNTRY = COUNTRIES[requestedCountry]
  ? requestedCountry
  : "ENG";

export const TEXT = COUNTRIES[ACTIVE_COUNTRY];

export function formatCurrency(value, options = {}) {
  const rounded = Math.round(value);
  const {
    symbol = TEXT.currency.symbol,
    position = TEXT.currency.position,
    spaced = TEXT.currency.spaced,
  } = options;
  const gap = spaced ? " " : "";

  if (position === "suffix") {
    return `${rounded}${gap}${symbol}`;
  }

  return `${symbol}${gap}${rounded}`;
}

export function formatMultiplier(value) {
  return `${TEXT.game.finalMultiplierPrefix}${Math.round(value)}`;
}
