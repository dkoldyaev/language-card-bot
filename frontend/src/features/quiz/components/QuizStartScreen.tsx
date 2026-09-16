import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { alpha, Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import { useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n';
import { trackEvent } from '../../../shared/lib/analytics';
import useStore from '../../../store/useStore';

export default function QuizStartScreen() {
  const { t } = useTranslation();
  const [starting, setStarting] = useState(false);
  const dictionary = useStore((state) => state.dictionary);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const activeDict = dictionaries.find((d) => d.id === activeDictionaryId) || dictionaries[0];

  const handleStartQuiz = async () => {
    if (dictionary.length === 0) return;
    setStarting(true);
    try {
      trackEvent('Quiz Started');
      await apiClient.post('/quiz/start');
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert(t('quiz.failedStart'));
    } finally {
      setStarting(false);
    }
  };

  const benefits = [
    t('quiz.benefit1'),
    t('quiz.benefit2'),
    t('quiz.benefit3'),
  ];

  return (
    <Box
      className="animate-fade-in"
      sx={{
        minHeight: { xs: 'auto', md: '68vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 880, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' } }}>
          <Box
            sx={{
              minHeight: { xs: 220, md: 420 },
              p: { xs: 3, sm: 4.5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#172033',
              color: '#FFFFFF',
            }}
          >
            <Box
              sx={{
                width: 58,
                height: 58,
                display: 'grid',
                placeItems: 'center',
                color: '#172033',
                backgroundColor: '#E8A17F',
              }}
            >
              <SchoolRoundedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Box sx={{ mt: { xs: 4, md: 0 } }}>
              <Typography variant="overline" sx={{ color: '#E8A17F' }}>
                {t('quiz.recallPracticeOverline')}
              </Typography>
              <Typography variant="h3" sx={{ color: '#FFFFFF', mt: 0.5, maxWidth: 280 }}>
                {t('quiz.memoryTitle')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 3, sm: 4.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="overline" color="secondary.main">
              {t('quiz.recallPracticeOverline')} {activeDict && `• ${activeDict.name} (${activeDict.targetLanguage.toUpperCase()})`}
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', sm: '2.55rem' }, mt: 0.5, mb: 1.25 }}>
              {t('quiz.readyTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, mb: 3 }}>
              {activeDict
                ? t('quiz.readyActiveDesc', { name: activeDict.name })
                : t('quiz.readyDefaultDesc')}
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.25, mb: 3.25 }}>
              {benefits.map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      color: 'success.dark',
                      backgroundColor: alpha('#24756D', 0.12),
                    }}
                  >
                    <CheckRoundedIcon sx={{ fontSize: 15 }} />
                  </Box>
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={handleStartQuiz}
                disabled={starting || dictionary.length === 0}
                endIcon={starting ? <CircularProgress size={18} color="inherit" /> : <ArrowForwardRoundedIcon />}
              >
                {t('quiz.startQuizBtn')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
