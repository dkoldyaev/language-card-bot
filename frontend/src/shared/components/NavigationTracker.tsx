import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigationTracker } from '../lib/navigationHistory';
import { clearSavedAppState, getSavedAppState } from '../lib/statePersistence';

export default function NavigationTracker() {
  useNavigationTracker();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = getSavedAppState();
    if (saved) {
      clearSavedAppState();
      const targetRoute = saved.route;
      const isValidRoute = targetRoute.startsWith('/') && !targetRoute.includes('://');
      if (isValidRoute && targetRoute !== window.location.pathname) {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [navigate]);

  return null;
}
