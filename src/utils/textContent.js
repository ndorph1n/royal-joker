import { localeBe } from "../locales/be";
import { localeDe } from "../locales/de";
import { localeEng } from "../locales/eng";
import { localeKz } from "../locales/kz";
import { localeNl } from "../locales/nl";
import { localePt } from "../locales/pt";

export const COUNTRIES = {
  BE: localeBe,
  DE: localeDe,
  ENG: localeEng,
  KZ: localeKz,
  NL: localeNl,
  PT: localePt,
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
