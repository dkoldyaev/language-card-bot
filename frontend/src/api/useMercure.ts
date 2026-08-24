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
        }
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
