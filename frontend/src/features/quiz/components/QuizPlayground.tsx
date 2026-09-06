import {
  Box, Button, Card, CardContent, Chip, CircularProgress, TextField, Typography, alpha,
} from '@mui/material';
import { useEffect, useState } from 'react';
import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import { trackEvent } from '../../../shared/lib/analytics';

const resultInfo = {
  SUCCESS: { label: 'Success! 🎉', color: '#24756D', background: '#E6F4EE' },
  CLOSE_MATCH: { label: 'Close Match 🤔', color: '#A96513', background: '#FFF1DA' },
  INCORRECT: { label: 'Incorrect 😢', color: '#B94343', background: '#FCE8E7' },
};

export default function QuizPlayground() {
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const quizCard = useStore((state) => state.quizCard);
  const quizEvaluation = useStore((state) => state.quizEvaluation);
  const quizTranslation = useStore((state) => state.quizTranslation);
  const quizVariants = useStore((state) => state.quizVariants);

  const handleSubmitSuggestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!suggestion.trim()) return;

    setSubmitting(true);
    try {
      trackEvent('Card Answered');
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

  if (!quizCard) return null;

  const result = quizEvaluation ? resultInfo[quizEvaluation.result] : null;

  return (
    <Box className="animate-fade-in" sx={{ maxWidth: 760, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="overline" color="secondary.main">Recall practice</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', sm: '2.85rem' }, mt: 0.35 }}>Quiz</Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={handleNextCard}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ mb: 0.35, whiteSpace: 'nowrap' }}
        >
          Next card
        </Button>
      </Box>

      <Card
        className="animate-scale-in"
        sx={{
          mb: 2,
          position: 'relative',
          overflow: 'hidden',
          borderColor: result ? alpha(result.color, 0.42) : '#E1E0DA',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 auto 0 0',
            width: 7,
            backgroundColor: result?.color || '#2453A6',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4.5 }, pl: { xs: 3.25, sm: 5 }, '&:last-child': { pb: { xs: 3, sm: 4.5 } } }}>
          <Typography variant="overline" color="text.secondary">Definition</Typography>
          <Typography
            variant="h3"
            sx={{
              mt: 1,
              fontSize: { xs: '1.55rem', sm: '2rem' },
              lineHeight: 1.35,
              maxWidth: 610,
            }}
          >
            {quizCard.definition.text}
          </Typography>

          {quizTranslation && (
            <Typography
              variant="body1"
              sx={{ mt: 2, color: 'success.dark', borderLeft: '3px solid #7AB8AF', pl: 1.5 }}
            >
              Translation: {quizTranslation}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box component="form" onSubmit={handleSubmitSuggestion} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          label="Your answer"
          placeholder="Type the word you remember"
          value={suggestion}
          onChange={(event) => setSuggestion(event.target.value)}
          disabled={submitting}
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!suggestion.trim() || submitting}
          aria-label="Submit"
          sx={{ minWidth: { xs: 52, sm: 116 }, px: { xs: 1.5, sm: 2 } }}
          endIcon={submitting ? undefined : <SendRoundedIcon />}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Submit</Box>}
        </Button>
      </Box>

      {quizEvaluation && result && (
        <Box
          className="animate-scale-in"
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.25,
            p: 2,
            mb: 2,
            borderRadius: 3,
            backgroundColor: result.background,
            border: '1px solid',
            borderColor: alpha(result.color, 0.22),
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" sx={{ color: result.color, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Your answer
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.1, fontWeight: 700 }}>
              {quizEvaluation.suggestion}
            </Typography>
          </Box>
          <Chip label={result.label} sx={{ color: result.color, backgroundColor: '#FFFFFF' }} />
        </Box>
      )}

      <Card sx={{ boxShadow: 'none', backgroundColor: '#FFFDF9' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Typography variant="subtitle1">Need a nudge?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, mb: 1.75 }}>
            Reveal only the help you need, then keep moving.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleTranslateDefinition}
              disabled={Boolean(quizTranslation)}
              startIcon={<TranslateRoundedIcon />}
            >
              Translate definition
            </Button>
            <Button
              variant="outlined"
              onClick={handleNextDefinition}
              startIcon={<ShuffleRoundedIcon />}
            >
              Another definition
            </Button>
            <Button
              variant="outlined"
              onClick={handleVariants}
              disabled={Boolean(quizVariants)}
              startIcon={<AppsRoundedIcon />}
            >
              Show variants
            </Button>
          </Box>

          {quizVariants && (
            <Box className="animate-fade-in" sx={{ mt: 2.25 }}>
              <Typography variant="overline" color="text.secondary">Choose an answer</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.75 }}>
                {quizVariants.map((variant) => (
                  <Button
                    key={variant}
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      setSuggestion(variant);
                      trackEvent('Card Answered');
                      apiClient.post('/quiz/answer', { suggestion: variant })
                        .catch((error) => console.error(error));
                    }}
                  >
                    {variant}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
