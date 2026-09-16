import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import {alpha,
  Box, Button, Card, CardContent, Chip, CircularProgress, TextField, Typography, 
} from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { trackEvent } from '../../../shared/lib/analytics';
import useStore from '../../../store/useStore';

export default function QuizPlayground() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const quizCard = useStore((state) => state.quizCard);
  const quizEvaluation = useStore((state) => state.quizEvaluation);
  const quizTranslation = useStore((state) => state.quizTranslation);
  const quizVariants = useStore((state) => state.quizVariants);

  const resultInfo = {
    SUCCESS: { label: t('quiz.successFeedback'), color: '#24756D', background: '#E6F4EE' },
    CLOSE_MATCH: { label: t('quiz.closeMatchFeedback'), color: '#A96513', background: '#FFF1DA' },
    INCORRECT: { label: t('quiz.incorrectFeedback'), color: '#B94343', background: '#FCE8E7' },
  };

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
          <Typography variant="overline" color="secondary.main">{t('quiz.recallPracticeOverline')}</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', sm: '2.85rem' }, mt: 0.35 }}>{t('quiz.title')}</Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={handleNextCard}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ mb: 0.35, whiteSpace: 'nowrap' }}
        >
          {t('quiz.nextCardBtn')}
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
          <Typography variant="overline" color="text.secondary">{t('quiz.definitionOverline')}</Typography>
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
              {t('quiz.translationPrefix', { text: quizTranslation })}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Box component="form" onSubmit={handleSubmitSuggestion} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          fullWidth
          label={t('quiz.answerLabel')}
          placeholder={t('quiz.answerPlaceholder')}
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
          aria-label={t('quiz.submitBtn')}
          sx={{ minWidth: { xs: 52, sm: 116 }, px: { xs: 1.5, sm: 2 } }}
          endIcon={submitting ? undefined : <SendRoundedIcon />}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('quiz.submitBtn')}</Box>}
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
            backgroundColor: result.background,
            border: '1px solid',
            borderColor: alpha(result.color, 0.22),
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" sx={{ color: result.color, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              {t('quiz.yourAnswerOverline')}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.1, fontWeight: 700 }}>
              {quizEvaluation.suggestion}
            </Typography>
          </Box>
          <Chip label={result.label} sx={{ color: result.color, backgroundColor: 'background.paper', fontWeight: 700 }} />
        </Box>
      )}

      <Card sx={{ boxShadow: 'none', backgroundColor: 'background.paper' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Typography variant="subtitle1">{t('quiz.needNudgeTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, mb: 1.75 }}>
            {t('quiz.needNudgeDesc')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleTranslateDefinition}
              disabled={Boolean(quizTranslation)}
              startIcon={<TranslateRoundedIcon />}
            >
              {t('quiz.translateDefBtn')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleNextDefinition}
              startIcon={<ShuffleRoundedIcon />}
            >
              {t('quiz.anotherDefBtn')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleVariants}
              disabled={Boolean(quizVariants)}
              startIcon={<AppsRoundedIcon />}
            >
              {t('quiz.showVariantsBtn')}
            </Button>
          </Box>

          {quizVariants && (
            <Box className="animate-fade-in" sx={{ mt: 2.25 }}>
              <Typography variant="overline" color="text.secondary">{t('quiz.chooseAnswerOverline')}</Typography>
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
