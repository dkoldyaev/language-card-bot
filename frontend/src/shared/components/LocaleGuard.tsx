import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { detectBrowserLanguage, isSupportedLocale, useTranslation } from '../i18n/I18nContext';
import { getCookie } from '../lib/cookie';

export default function LocaleGuard({ children }: { children?: React.ReactNode }) {
  const { locale } = useParams();
  const location = useLocation();
  const { locale: currentLocale, setLocale } = useTranslation();

  // Ensure context and cookie are synced if locale is valid
  useEffect(() => {
    if (locale && isSupportedLocale(locale) && locale !== currentLocale) {
      setLocale(locale);
    }
  }, [locale, currentLocale, setLocale]);

  if (!isSupportedLocale(locale)) {
    // URL matched /:locale but it's not a valid locale (e.g., /dictionary)
    // We should redirect to /<cookie-locale>/...
    const cookieLocale = getCookie('locale');
    const fallback = isSupportedLocale(cookieLocale) ? cookieLocale : detectBrowserLanguage();

    const newPath = `/${fallback}${location.pathname === '/' ? '' : location.pathname}${location.search}${location.hash}`;
    return <Navigate to={newPath} replace />;
  }

  return children ? children : <Outlet />;
}
