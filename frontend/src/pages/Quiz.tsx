import { Typography, Box, Button, CircularProgress, Card, CardContent, TextField, Chip } from '@mui/material';
import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function Quiz() {
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  
  const quizCard = useStore((state) => state.quizCard);
  const quizEvaluation = useStore((state) => state.quizEvaluation);
  const quizTranslation = useStore((state) => state.quizTranslation);
  const quizVariants = useStore((state) => state.quizVariants);

  const handleStartQuiz = async () => {
    setStarting(true);
    try {
      await apiClient.post('/quiz/start');
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert('Failed to start quiz.');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    
    setSubmitting(true);
    try {
      await apiClient.post('/quiz/answer', { suggestion });
      setSuggestion('');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTranslateDefinition = async () => {
    try {
      await apiClient.post('/quiz/translate_definition');
    } catch (error) {
      console.error('Failed to translate definition:', error);
    }
  };

  const handleNextDefinition = async () => {
    try {
      await apiClient.post('/quiz/next_definition');
    } catch (error) {
      console.error('Failed to get next definition:', error);
    }
  };

  const handleVariants = async () => {
    try {
      await apiClient.post('/quiz/variants');
    } catch (error) {
      console.error('Failed to get variants:', error);
    }
  };

  const handleNextCard = async () => {
    try {
      await apiClient.post('/quiz/next_card');
    } catch (error) {
      console.error('Failed to get next card:', error);
    }
  };

  useEffect(() => {
    if (quizEvaluation?.result === 'SUCCESS') {
      const timer = setTimeout(() => {
        handleNextCard();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [quizEvaluation?.result]);

  useEffect(() => {
    setSuggestion('');
  }, [quizCard]);

  if (!quizCard) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
        <Typography variant="h5" gutterBottom>Ready to test your vocabulary?</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          size="large" 
          onClick={handleStartQuiz}
          disabled={starting}
          sx={{ mt: 2 }}
        >
          {starting ? <CircularProgress size={24} color="inherit" /> : 'Start Quiz'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" gutterBottom>Quiz</Typography>
      
      <Card sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            {quizCard.definition.text}
          </Typography>
        </CardContent>
      </Card>

      <Box component="form" onSubmit={handleSubmitSuggestion} sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Your answer"
          variant="outlined"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          disabled={submitting}
        />
        <Button 
          type="submit" 
          variant="contained" 
          disabled={!suggestion.trim() || submitting}
          sx={{ minWidth: 100 }}
        >
          {submitting ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </Box>

      {quizEvaluation && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1">
            Your answer: <strong>{quizEvaluation.suggestion}</strong>
          </Typography>
          {quizEvaluation.result === 'SUCCESS' && (
            <Chip label="Success! 🎉" color="success" />
          )}
          {quizEvaluation.result === 'CLOSE_MATCH' && (
            <Chip label="Close Match 🤔" color="warning" />
          )}
          {quizEvaluation.result === 'INCORRECT' && (
            <Chip label="Incorrect 😢" color="error" />
          )}
        </Box>
      )}

      {quizTranslation && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" color="textSecondary" align="center">
            Translation: {quizTranslation}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
        <Button 
          variant="outlined" 
          onClick={handleTranslateDefinition}
          disabled={Boolean(quizTranslation)}
        >
          Translate definition
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleNextDefinition}
        >
          Another definition
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleVariants}
          disabled={Boolean(quizVariants)}
        >
          Show variants
        </Button>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={handleNextCard}
        >
          Next card
        </Button>
      </Box>

      {quizVariants && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>Variants:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {quizVariants.map((variant, index) => (
              <Button 
                key={index} 
                variant="contained" 
                color="secondary"
                onClick={() => {
                  setSuggestion(variant);
                  // We can't easily auto-submit here without fighting state, 
                  // but we could call the submit logic directly.
                  apiClient.post('/quiz/answer', { suggestion: variant })
                    .catch(err => console.error(err));
                }}
              >
                {variant}
              </Button>
            ))}
          </Box>
        </Box>
      )}
      
    </Box>
  );
}
