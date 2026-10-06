import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useActiveDictionaryId } from '../../../shared/hooks/useActiveDictionaryId';
import { trackEvent } from '../../../shared/lib/analytics';
import { LoadingState, PageContainer } from '../../../shared/ui';
import useStore from '../../../store/useStore';
import QuizEmptyState from '../components/QuizEmptyState';
import QuizPlayground from '../components/QuizPlayground';

export default function QuizPage() {
  const quizCard = useStore((state) => state.quizCard);
  const dictionary = useStore((state) => state.dictionary);
  const activeDictionaryId = useActiveDictionaryId();
  const isDictionaryLoading = useStore((state) => state.isDictionaryLoading);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (dictionary.length > 0 && !quizCard && !starting && !startError) {
      setStarting(true);
      trackEvent('Quiz Started');
      apiClient.post('/quiz/start', { dictionaryId: activeDictionaryId })
        .catch((error) => {
          console.error('Failed to auto-start quiz:', error);
          setStartError(error.response?.data?.error || 'Failed to start quiz');
          setStarting(false);
        });
    }
  }, [dictionary.length, quizCard, starting, startError, activeDictionaryId]);

  if (isDictionaryLoading) {
    return (
      <PageContainer size="narrow">
        <LoadingState minHeight="60vh" />
      </PageContainer>
    );
  }

  if (dictionary.length === 0) {
    return (
      <PageContainer size="default">
        <QuizEmptyState />
      </PageContainer>
    );
  }

  if (startError) {
    return (
      <PageContainer size="default">
        <QuizEmptyState />
      </PageContainer>
    );
  }

  if (!quizCard) {
    return (
      <PageContainer size="narrow">
        <LoadingState minHeight="60vh" />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="narrow">
      <QuizPlayground />
    </PageContainer>
  );
}
