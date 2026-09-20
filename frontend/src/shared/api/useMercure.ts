import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

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
              if (data.type === 'dictionary_add_duplicate' || 
                  data.type === 'dictionary_add_processing' || 
                  data.type === 'dictionary_add_definitions_received') {
                if (data.type === 'dictionary_add_processing') {
                  if (Array.isArray(data.words)) {
                    useStore.getState().addDictionaryWords(
                      data.words.map((item: { wordId: number; word: string; presets?: { id: number; title: string }[] }) => ({
                        id: item.wordId,
                        text: item.word,
                        definitions: [],
                        presets: item.presets || [],
                      }))
                    );
                  }
                } else if (data.type === 'dictionary_add_definitions_received') {
                  if (Array.isArray(data.words)) {
                    useStore.getState().setDictionaryDefinitionsBatch(data.words);
                  }
                }
                window.dispatchEvent(new CustomEvent('mercure-word-status', { detail: data }));
              } else if (data.type === 'definition_translate_loaded') {
                if (Array.isArray(data.words)) {
                  useStore.getState().updateDictionaryTranslationsBatch(data.words);
                }
              } else if (data.type === 'state_sync') {
                useStore.getState().setAppState(data);
              } else if (data.type === 'dictionaries_sync' && data.dictionaries) {
                useStore.getState().setDictionaries(data.dictionaries);
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
