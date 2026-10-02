import AppsRoundedIcon from '@mui/icons-material/AppsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import {
  alpha,
  Box,
  Chip,
  Dialog,
  IconButton,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { trackEvent } from '../../../shared/lib/analytics';
import {
  AppButton,
  AppCard,
  AppTextField,
  colorTokens,
  radiusTokens,
  spacingTokens,
} from '../../../shared/ui';
import useStore from '../../../store/useStore';

const handleTranslateDefinition = async () => {
  try {
    const dictionaryId = useStore.getState().activeDictionaryId;
    await apiClient.post('/quiz/translate_definition', { dictionaryId });
  } catch (error) {
    console.error('Failed to translate definition:', error);
  }
};

const handleNextDefinition = async () => {
  try {
    const dictionaryId = useStore.getState().activeDictionaryId;
    await apiClient.post('/quiz/next_definition', { dictionaryId });
  } catch (error) {
    console.error('Failed to get next definition:', error);
  }
};

const handleVariants = async () => {
  try {
    const dictionaryId = useStore.getState().activeDictionaryId;
    await apiClient.post('/quiz/variants', { dictionaryId });
  } catch (error) {
    console.error('Failed to get variants:', error);
  }
};

const handleNextCard = async () => {
  try {
    const dictionaryId = useStore.getState().activeDictionaryId;
    await apiClient.post('/quiz/next_card', { dictionaryId });
  } catch (error) {
    console.error('Failed to get next card:', error);
  }
};

export default function QuizPlayground() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const quizCard = useStore((state) => state.quizCard);
  const quizEvaluation = useStore((state) => state.quizEvaluation);
  const quizTranslation = useStore((state) => state.quizTranslation);
  const quizVariants = useStore((state) => state.quizVariants);

  const resultInfo = {
    SUCCESS: { label: t('quiz.successFeedback'), color: colorTokens.learningStatus.mastered.color, background: colorTokens.learningStatus.mastered.lightBg },
    CLOSE_MATCH: { label: t('quiz.closeMatchFeedback'), color: colorTokens.learningStatus.streak.color, background: colorTokens.learningStatus.streak.lightBg },
    INCORRECT: { label: t('quiz.incorrectFeedback'), color: colorTokens.learningStatus.attention.color, background: colorTokens.learningStatus.attention.lightBg },
  };

  const randomImage = useMemo(() => {
    const images = quizCard?.definition?.images;
    if (!images || images.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  }, [quizCard?.definition?.id, quizCard?.definition?.images]);

  const handleSubmitSuggestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!suggestion.trim()) return;

    setSubmitting(true);
    try {
      trackEvent('Card Answered');
      const dictionaryId = useStore.getState().activeDictionaryId;
      const res = await apiClient.post('/quiz/answer', { suggestion, dictionaryId });
      if (res.data?.evaluation) {
        useStore.getState().setQuizEvaluation({
          result: res.data.evaluation.result,
          suggestion: res.data.evaluation.suggestion,
        });
      }
      setSuggestion('');
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setSubmitting(false);
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Clear suggestion when card changes
  useEffect(() => {
    setSuggestion('');
  }, [quizCard]);

  if (!quizCard) return null;

  const result = quizEvaluation ? resultInfo[quizEvaluation.result] : null;

  return (
    <Box className="animate-fade-in" sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: spacingTokens.section_header_gap * 1.5 }}>
        <Box>
          <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800 }}>
            {t('quiz.recallPracticeOverline')}
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', sm: '2.85rem' }, mt: 0.35, fontWeight: 800 }}>
            {t('quiz.title')}
          </Typography>
        </Box>
        <AppButton
          variant="outline"
          size="small"
          onClick={handleNextCard}
          endIcon={<ArrowForwardRoundedIcon />}
          sx={{ mb: 0.5, whiteSpace: 'nowrap' }}
        >
          {t('quiz.nextCardBtn')}
        </AppButton>
      </Box>

      <AppCard
        className="animate-scale-in"
        padding="spacious"
        sx={{
          mb: spacingTokens.element_group_gap * 2,
          position: 'relative',
          overflow: 'hidden',
          borderColor: result ? alpha(result.color, 0.42) : 'divider',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 auto 0 0',
            width: 7,
            backgroundColor: result?.color || colorTokens.brand.blue,
          },
        }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
          {t('quiz.definitionOverline')}
        </Typography>
        <Typography
          variant="h3"
          sx={{
            mt: 1,
            fontSize: { xs: '1.55rem', sm: '2rem' },
            lineHeight: 1.35,
            fontWeight: 800,
            maxWidth: 610,
          }}
        >
          {quizCard.definition.text}
        </Typography>

        {randomImage && (
          <Box
            sx={{
              mt: 2.5,
              position: 'relative',
              borderRadius: `${radiusTokens.md}px`,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              maxHeight: { xs: 220, sm: 280 },
              width: '100%',
              backgroundColor: 'action.hover',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'scale(1.01)',
                boxShadow: 3,
              },
            }}
            onClick={() => setPreviewOpen(true)}
            role="button"
            tabIndex={0}
            aria-label={t('quiz.viewImageAria', { source: randomImage.source })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setPreviewOpen(true);
              }
            }}
          >
            <Box
              component="img"
              src={randomImage.url}
              alt={quizCard.definition.text}
              loading="lazy"
              sx={{
                width: '100%',
                maxHeight: { xs: 220, sm: 280 },
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <Chip
              size="small"
              label={t('quiz.imageSource', { source: randomImage.source })}
              sx={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(6px)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'capitalize',
                pointerEvents: 'none',
              }}
            />
          </Box>
        )}

        {quizTranslation && (
          <Typography
            variant="body1"
            sx={{
              mt: 2,
              color: 'success.dark',
              borderLeft: `3px solid ${colorTokens.learningStatus.mastered.color}`,
              pl: 1.5,
              fontWeight: 600,
            }}
          >
            {t('quiz.translationPrefix', { text: quizTranslation })}
          </Typography>
        )}
      </AppCard>

      {randomImage && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: `${radiusTokens.lg}px`,
                overflow: 'hidden',
                backgroundColor: 'background.paper',
              },
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => setPreviewOpen(false)}
              aria-label={t('quiz.closeImagePreview')}
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                zIndex: 1,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                },
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
            <Box
              component="img"
              src={randomImage.url}
              alt={quizCard.definition.text}
              sx={{
                width: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                display: 'block',
                backgroundColor: '#000000',
              }}
            />
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {quizCard.definition.text}
              </Typography>
              <Chip
                size="small"
                label={t('quiz.imageSource', { source: randomImage.source })}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                  flexShrink: 0,
                }}
              />
            </Box>
          </Box>
        </Dialog>
      )}

      <Box
        component="form"
        onSubmit={handleSubmitSuggestion}
        sx={{ display: 'flex', gap: spacingTokens.element_group_gap, mb: spacingTokens.element_group_gap * 2 }}
      >
        <AppTextField
          fullWidth
          label={t('quiz.answerLabel')}
          placeholder={t('quiz.answerPlaceholder')}
          value={suggestion}
          onChange={(event) => setSuggestion(event.target.value)}
          disabled={submitting}
          autoComplete="off"
        />
        <AppButton
          type="submit"
          variant="primary"
          disabled={!suggestion.trim() || submitting}
          loading={submitting}
          aria-label={t('quiz.submitBtn')}
          endIcon={<SendRoundedIcon />}
          sx={{ minWidth: { xs: 52, sm: 116 }, px: { xs: 1.5, sm: 2 } }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {t('quiz.submitBtn')}
          </Box>
        </AppButton>
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
            mb: spacingTokens.element_group_gap * 2,
            backgroundColor: (th) =>
              th.palette.mode === 'dark' ? alpha(result.color, 0.18) : result.background,
            border: '1px solid',
            borderColor: alpha(result.color, 0.25),
            borderRadius: `${radiusTokens.md}px`,
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: result.color, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase' }}
            >
              {t('quiz.yourAnswerOverline')}
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.1, fontWeight: 800 }}>
              {quizEvaluation.suggestion}
            </Typography>
          </Box>
          <Chip
            label={result.label}
            sx={{
              color: result.color,
              backgroundColor: 'background.paper',
              fontWeight: 800,
              borderRadius: `${radiusTokens.sm}px`,
            }}
          />
        </Box>
      )}

      <AppCard padding="compact">
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {t('quiz.needNudgeTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, mb: 2 }}>
          {t('quiz.needNudgeDesc')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: spacingTokens.element_group_gap }}>
          <AppButton
            variant="outline"
            size="small"
            onClick={handleTranslateDefinition}
            disabled={Boolean(quizTranslation)}
            startIcon={<TranslateRoundedIcon />}
          >
            {t('quiz.translateDefBtn')}
          </AppButton>
          <AppButton
            variant="outline"
            size="small"
            onClick={handleNextDefinition}
            startIcon={<ShuffleRoundedIcon />}
          >
            {t('quiz.anotherDefBtn')}
          </AppButton>
          <AppButton
            variant="outline"
            size="small"
            onClick={handleVariants}
            disabled={Boolean(quizVariants)}
            startIcon={<AppsRoundedIcon />}
          >
            {t('quiz.showVariantsBtn')}
          </AppButton>
        </Box>

        {quizVariants && (
          <Box className="animate-fade-in" sx={{ mt: 2.5 }}>
            <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
              {t('quiz.chooseAnswerOverline')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: spacingTokens.element_group_gap, mt: 1 }}>
              {quizVariants.map((variant) => (
                <AppButton
                  key={variant}
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setSuggestion(variant);
                    trackEvent('Card Answered');
                    const dictionaryId = useStore.getState().activeDictionaryId;
                    apiClient.post('/quiz/answer', { suggestion: variant, dictionaryId })
                      .then((res) => {
                        if (res.data?.evaluation) {
                          useStore.getState().setQuizEvaluation({
                            result: res.data.evaluation.result,
                            suggestion: res.data.evaluation.suggestion,
                          });
                        }
                      })
                      .catch((error) => console.error(error));
                  }}
                >
                  {variant}
                </AppButton>
              ))}
            </Box>
          </Box>
        )}
      </AppCard>
    </Box>
  );
}
