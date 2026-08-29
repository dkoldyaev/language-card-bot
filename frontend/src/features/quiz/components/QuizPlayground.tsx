import {
  Typography, Box, Button, CircularProgress, Card, CardContent,
  TextField, Chip, alpha, Tooltip,
} from '@mui/material';
import { useState, useEffect } from 'react';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';

export default function QuizPlayground() {
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const quizCard = useStore((state) => state.quizCard);
  const quizEvaluation = useStore((state) => state.quizEvaluation);
  const quizTranslation = useStore((state) => state.quizTranslation);
  const quizVariants = useStore((state) => state.quizVariants);

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

  const evalColor =
    quizEvaluation?.result === 'SUCCESS' ? '#10B981' :
    quizEvaluation?.result === 'CLOSE_MATCH' ? '#F59E0B' :
    quizEvaluation?.result === 'INCORRECT' ? '#EF4444' : null;

  const evalAnimation =
    quizEvaluation?.result === 'SUCCESS' ? 'pulseSuccess' :
    quizEvaluation?.result === 'CLOSE_MATCH' ? 'pulseWarning' :
    quizEvaluation?.result === 'INCORRECT' ? 'pulseError' : null;

  if (!quizCard) return null;

  return (
    <Box className="animate-fade-in" sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          mb: 3,
          background: 'linear-gradient(135deg, #F3F4F6 0%, #A78BFA 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Quiz
      </Typography>

      <Card
        className="animate-scale-in"
        sx={{
          mb: 3,
          position: 'relative',
          overflow: 'visible',
          transition: 'all 0.4s ease',
          ...(evalColor && {
            borderColor: alpha(evalColor, 0.5),
            animation: `${evalAnimation} 1.5s ease-in-out`,
          }),
        }}
      >
        <CardContent
          sx={{
            p: { xs: 3, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 180,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.6,
              color: 'text.primary',
            }}
          >
            {quizCard.definition.text}
          </Typography>

          {quizTranslation && (
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: 'secondary.light',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              Translation: {quizTranslation}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box
        component="form"
        onSubmit={handleSubmitSuggestion}
        sx={{ display: 'flex', gap: 1.5, mb: 3 }}
      >
        <TextField
          fullWidth
          label="Your answer"
          variant="outlined"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          disabled={submitting}
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!suggestion.trim() || submitting}
          aria-label="Submit"
          sx={{
            minWidth: 56,
            px: 2,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            },
          }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : <SendRoundedIcon />}
        </Button>
      </Box>

      {quizEvaluation && (
        <Box
          className="animate-scale-in"
          sx={{
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: 3,
            backgroundColor: alpha(evalColor || '#000', 0.08),
            border: `1px solid ${alpha(evalColor || '#000', 0.2)}`,
          }}
        >
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
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

      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
        <Tooltip title="Show translated definition">
          <span>
            <Button
              variant="outlined"
              onClick={handleTranslateDefinition}
              disabled={Boolean(quizTranslation)}
              startIcon={<TranslateRoundedIcon />}
              size="small"
            >
              Translate definition
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Show another definition for the same word">
          <Button
            variant="outlined"
            onClick={handleNextDefinition}
            startIcon={<ShuffleRoundedIcon />}
            size="small"
          >
            Another definition
          </Button>
        </Tooltip>
        <Tooltip title="Show multiple-choice options">
          <span>
            <Button
              variant="outlined"
              onClick={handleVariants}
              disabled={Boolean(quizVariants)}
              startIcon={<AppsRoundedIcon />}
              size="small"
            >
              Show variants
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Skip to next word">
          <span>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleNextCard}
              startIcon={<SkipNextRoundedIcon />}
              size="small"
              aria-label="Next card"
            >
              Next card
            </Button>
          </span>
        </Tooltip>
      </Box>

      {quizVariants && (
        <Box className="animate-fade-in" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.7rem' }}>
            Variants:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {quizVariants.map((variant, index) => (
              <Button
                key={index}
                variant="contained"
                color="secondary"
                onClick={() => {
                  setSuggestion(variant);
                  apiClient.post('/quiz/answer', { suggestion: variant })
                    .catch(err => console.error(err));
                }}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  },
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
