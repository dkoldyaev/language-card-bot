import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { trackEvent } from '../../../shared/lib/analytics';
import useStore from '../../../store/useStore';
import QuizEmptyState from '../components/QuizEmptyState';
import QuizPlayground from '../components/QuizPlayground';

export default function QuizPage() {
  const quizCard = useStore((state) => state.quizCard);
  const dictionary = useStore((state) => state.dictionary);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (dictionary.length > 0 && !quizCard && !starting) {
      setStarting(true);
      trackEvent('Quiz Started');
      apiClient.post('/quiz/start')
        .catch((error) => {
          console.error('Failed to auto-start quiz:', error);
        })
        .finally(() => {
          setStarting(false);
        });
    }
  }, [dictionary.length, quizCard, starting]);

  if (dictionary.length === 0) {
    return <QuizEmptyState />;
  }

  if (!quizCard) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <QuizPlayground />;
}
