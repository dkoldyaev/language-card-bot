import { Box, Typography, Button, CircularProgress, alpha } from '@mui/material';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { useState } from 'react';
import apiClient from '../../../shared/api/client';

export default function QuizStartScreen() {
  const [starting, setStarting] = useState(false);

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

  return (
    <Box
      className="animate-fade-in"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #7C3AED, #06B6D4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          animation: 'float 3s ease-in-out infinite',
          boxShadow: `0 12px 40px ${alpha('#7C3AED', 0.3)}`,
        }}
      >
        <SchoolRoundedIcon sx={{ fontSize: 40, color: '#fff' }} />
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Ready to test your vocabulary?
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
        We&apos;ll show you definitions and you guess the word. Let&apos;s see how many you know!
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={handleStartQuiz}
        disabled={starting}
        sx={{
          px: 5,
          py: 1.5,
          fontSize: '1rem',
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          '&:hover': {
            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          },
        }}
      >
        {starting ? <CircularProgress size={24} color="inherit" /> : 'Start Quiz'}
      </Button>
    </Box>
  );
}
