import { Typography, Box, Button, CircularProgress, Card, CardContent } from '@mui/material';
import { useState } from 'react';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function Quiz() {
  const [starting, setStarting] = useState(false);
  const quizCard = useStore((state) => state.quizCard);

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
      
    </Box>
  );
}
