import { getCookie, setCookie } from "../lib/cookie";
import { type LanguageCode, NATIVE_LANGUAGE_COOKIE } from ".";
import { isSupportedLocale } from "./I18nContext";

export const getInitialBaseLanguage = (currentLocale: LanguageCode): LanguageCode => {
  const saved = getCookie<LanguageCode>(NATIVE_LANGUAGE_COOKIE);
  if (saved && isSupportedLocale(saved)) {
    return saved;
  }
  return currentLocale;
};

export const saveBaseLanguage = (language: LanguageCode) => {
  if (!isSupportedLocale(language)) {
    return;
  }
  setCookie(NATIVE_LANGUAGE_COOKIE, language);
};