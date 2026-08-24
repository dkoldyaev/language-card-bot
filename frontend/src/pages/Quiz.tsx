import { Typography, Box, Button, CircularProgress, Card, CardContent, TextField, Chip } from '@mui/material';
import { useState } from 'react';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function Quiz() {
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  
  const quizCard = useStore((state) => state.quizCard);
  const quizEvaluation = useStore((state) => state.quizEvaluation);

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
      setSuggestion(''); // Clear input after submission
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
    }
  };

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
      
    </Box>
  );
}
