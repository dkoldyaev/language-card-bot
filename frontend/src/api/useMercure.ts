import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export function useMercure() {
  const profile = useStore((state) => state.profile);
  const mercureToken = useStore((state) => state.mercureToken);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!profile || !mercureToken) return;

    const mercureUrl = import.meta.env.VITE_MERCURE_PUBLIC_URL;
    const baseDomain = import.meta.env.VITE_BASE_DOMAIN;
    
    if (!mercureUrl) {
      throw new Error('VITE_MERCURE_PUBLIC_URL is not defined in the environment.');
    }
    if (!baseDomain) {
      throw new Error('VITE_BASE_DOMAIN is not defined in the environment.');
    }
    const topic = `${baseDomain}/v1/users/${profile.username}`;
    
    const url = new URL(mercureUrl, window.location.origin);
    url.searchParams.append('topic', topic);

    abortControllerRef.current = new AbortController();

    const connect = async () => {
      try {
        await fetchEventSource(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mercureToken}`,
            'Accept': 'text/event-stream'
          },
          signal: abortControllerRef.current?.signal,
          onmessage(event) {
            try {
              const data = JSON.parse(event.data);
              const updateWordProcessing = useStore.getState().updateWordProcessing;

              if (data.type === 'dictionary_add_duplicate') {
                updateWordProcessing({ word: data.word, status: 'duplicate', definitionsCount: data.definitionsCount });
              } else if (data.type === 'dictionary_add_processing') {
                updateWordProcessing({ word: data.word, status: 'processing' });
              } else if (data.type === 'dictionary_add_definitions_received') {
                updateWordProcessing({ word: data.word, status: 'definitions_received', definitionsCount: data.definitionsCount });
              } else if (data.type === 'dictionary_add_definition_processed') {
                updateWordProcessing({ word: data.word, status: 'processed', processedCount: data.processedCount, totalDefinitions: data.totalDefinitions });
              } else if (data.type === 'state_sync') {
                useStore.getState().setAppState(data);
              } else if (data.type === 'quiz_card') {
                useStore.getState().setQuizCard(data);
                useStore.getState().setQuizEvaluation(null); // Reset evaluation on new card
              } else if (data.type === 'quiz_answer_evaluation') {
                useStore.getState().setQuizEvaluation({ result: data.result, suggestion: data.suggestion });
              } else if (data.type === 'quiz_definition_translation') {
                useStore.getState().setQuizTranslation(data.translation);
              } else if (data.type === 'quiz_variants') {
                useStore.getState().setQuizVariants(data.variants);
              }
            } catch (error) {
              console.error('Error parsing Mercure message:', error);
            }
          },
          onerror(err) {
            console.error('Mercure connection error:', err);
            // Wait 1 second before retrying, fetchEventSource will retry automatically if we don't throw
          }
        });
      } catch (err) {
        console.error('fetchEventSource failed:', err);
      }
    };

    connect();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [profile, mercureToken]);
}
