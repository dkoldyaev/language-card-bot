import { getCookie, setCookie } from "../lib/cookie";
import { NATIVE_LANGUAGE_COOKIE } from ".";
import { isSupportedLocale } from "./I18nContext";

export const getInitialBaseLanguage = (currentLocale: string): string => {
  const saved = getCookie(NATIVE_LANGUAGE_COOKIE);
  if (saved && isSupportedLocale(saved)) {
    return saved;
  }
  return currentLocale;
};

export const saveBaseLanguage = (language: string) => {
  if (!isSupportedLocale(language)) {
    return;
  }
  setCookie(NATIVE_LANGUAGE_COOKIE, language);
};