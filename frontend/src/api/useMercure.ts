import { useEffect } from 'react';
import useStore from '../store/useStore';

export function useMercure() {
  const profile = useStore((state) => state.profile);

  useEffect(() => {
    if (!profile) return;

    const mercureUrl = import.meta.env.VITE_MERCURE_PUBLIC_URL || 'http://localhost:9090/.well-known/mercure';
    // Use window.location.origin as a fallback BASE_DOMAIN for topic
    const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'http://localhost';
    const topic = `${baseDomain}/v1/users/${profile.username}`;
    
    const url = new URL(mercureUrl);
    url.searchParams.append('topic', topic);

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle incoming data based on its type
        // e.g. state sync or word processing updates
        // useStore.getState().dispatchSomeAction(data);
      } catch (error) {
        console.error('Error parsing Mercure message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Mercure connection error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [profile]);
}
