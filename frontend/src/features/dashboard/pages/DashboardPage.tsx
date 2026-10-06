import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import {
  alpha,
  Box,
  Button,
  Chip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActiveDictionaryId } from '../../../shared/hooks/useActiveDictionaryId';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import {
  AppButton,
  AppCard,
  colorTokens,
  PageContainer,
  PageHeader,
  radiusTokens,
  Section,
  spacingTokens,
} from '../../../shared/ui';
import useStore from '../../../store/useStore';
import CreateDictionaryDialog from '../../dictionary/components/CreateDictionaryDialog';
import DictionaryPresets from '../../dictionary/components/DictionaryPresets';
import { fetchDashboardStats } from '../api/dashboard.api';
import DashboardKpiBar from '../components/DashboardKpiBar';
import NeedsAttentionWidget from '../components/NeedsAttentionWidget';
import QuickAddWordCard from '../components/QuickAddWordCard';
import WeeklyActivityChart from '../components/WeeklyActivityChart';
import { computeGuestDashboardStats } from '../lib/guestStats';

export default function Dashboard() {
  const { t } = useTranslation();
  const token = useStore((state) => state.token);
  const profile = useStore((state) => state.profile);
  const dictionary = useStore((state) => state.dictionary);
  const guestAttempts = useStore((state) => state.guestQuizAttempts);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useActiveDictionaryId();
  const dashboardStats = useStore((state) => state.dashboardStats);
  const setDashboardStats = useStore((state) => state.setDashboardStats);
  const navigate = useNavigate();
  const { locale } = useParams<{ locale: string }>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const totalWords = dictionary.length;
  const totalDefinitions = dictionary.reduce((sum, word) => sum + word.definitions.length, 0);
  const recentWords = dictionary.slice(-6).reverse();

  const targetDictId = activeDictionaryId ?? dictionaries[0]?.id;
  const activeDict = dictionaries.find((d) => d.id === targetDictId);

  const loadGuestStats = useCallback(() => {
    if (!token) {
      const stats = computeGuestDashboardStats(dictionary, guestAttempts);
      setDashboardStats(stats);
    }
  }, [dictionary, guestAttempts, token, setDashboardStats]);

  const loadAuthStats = useCallback((signal?: AbortSignal) => {
    if (!token || !targetDictId) return;

    fetchDashboardStats(targetDictId, signal)
      .then((stats) => {
        setDashboardStats(stats);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'CanceledError') return;
        console.error('Failed to load dashboard stats:', error);
      });
  }, [token, targetDictId, setDashboardStats]);

  const loadStats = useCallback(() => {
    if (token) {
      loadAuthStats();
    } else {
      loadGuestStats();
    }
  }, [token, loadAuthStats, loadGuestStats]);

  useEffect(() => {
    if (!token) {
      loadGuestStats();
    }
  }, [token, loadGuestStats]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    loadAuthStats(controller.signal);
    return () => {
      controller.abort();
    };
  }, [token, loadAuthStats]);

  useEffect(() => {
    if (dictionaries.length === 0) {
      setCreateDialogOpen(true);
    }
  }, [dictionaries.length]);

  const hasQuizzes = (dashboardStats?.totalAttempts ?? 0) > 0;
  const isDeckEmpty = totalWords === 0;

  const openDictionary = () => {
    if (targetDictId) {
      navigate(`/${locale}/dictionary/${targetDictId}`);
      return;
    }
    setCreateDialogOpen(true);
  };

  const startQuiz = () => {
    if (targetDictId) {
      navigate(`/${locale}/quiz/${targetDictId}`);
    }
  };

  return (
    <PageContainer size="default" sx={{ pb: spacingTokens.page_outer_vertical_padding.md * 1.5 }}>
      {/* Header Greeting */}
      <PageHeader
        overline={t('dashboard.overline')}
        title={profile ? t('dashboard.welcomeUser', { name: profile.username }) : t('dashboard.welcomeGuest')}
        subtitle={t('dashboard.desc')}
      />

      {/* KPI Bar for Active Users */}
      {hasQuizzes && dashboardStats && <DashboardKpiBar stats={dashboardStats} />}

      {/* STATE 1: Empty Dictionary (Onboarding) */}
      {isDeckEmpty && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.section_vertical_gap }}>
          {/* Main Action Card + Quick Add */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
              gap: spacingTokens.element_group_gap * 2.5,
              alignItems: 'stretch',
            }}
          >
            <AppCard variant="hero" padding="spacious">
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>
                {t('dashboard.readyOverline')}
              </Typography>
              <Typography variant="h4" component="h2" sx={{ color: 'text.primary', mt: 0.5, mb: 1, fontWeight: 800 }}>
                {t('dashboard.readyTitle')}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', maxWidth: 460, mb: spacingTokens.section_header_gap * 1.5 }}
              >
                {t('dashboard.readyEmptyDesc')}
              </Typography>

              <AppButton
                variant="secondary"
                disabled={true}
                onClick={startQuiz}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                {t('dashboard.startQuizBtn')}
              </AppButton>
            </AppCard>

            <QuickAddWordCard onWordAdded={loadStats} />
          </Box>



          {/* Starter Presets Section */}
          {activeDict && (
            <Section title={t('dashboard.starterPacksTitle')}>
              <DictionaryPresets dictionary={activeDict} onPresetApplied={loadStats} />
            </Section>
          )}
        </Box>
      )}

      {/* STATE 2: Words Added, No Quizzes Yet */}
      {!isDeckEmpty && !hasQuizzes && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.section_vertical_gap }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' },
              gap: spacingTokens.element_group_gap * 2.5,
              alignItems: 'stretch',
            }}
          >
            <AppCard variant="hero" padding="spacious">
              <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>
                {t('dashboard.readyHeroTitle')}
              </Typography>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  color: 'text.primary',
                  mt: 0.5,
                  mb: 1,
                  fontSize: { xs: '1.8rem', sm: '2.2rem' },
                  fontWeight: 800,
                }}
              >
                {t('dashboard.readyTitle')}
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: 480, mb: spacingTokens.section_header_gap * 1.5 }}
              >
                {t('dashboard.readyHeroDesc', { count: totalWords })}
              </Typography>

              <AppButton
                variant="secondary"
                size="large"
                onClick={startQuiz}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                {t('dashboard.startQuizBtn')}
              </AppButton>
            </AppCard>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.element_group_gap * 2 }}>
              <QuickAddWordCard onWordAdded={loadStats} />

              <AppCard padding="compact">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {t('dashboard.yourDeck')}
                  </Typography>
                  <Button
                    size="small"
                    onClick={openDictionary}
                    startIcon={<TranslateRoundedIcon fontSize="small" />}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {t('dashboard.manageVocabulary')}
                  </Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{
                        color: (th) => (th.palette.mode === 'dark' ? th.palette.primary.light : 'primary.dark'),
                        fontWeight: 800,
                      }}
                    >
                      {totalWords}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard.wordsSaved')}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="h4"
                      sx={{
                        color: (th) => (th.palette.mode === 'dark' ? th.palette.primary.light : 'primary.dark'),
                        fontWeight: 800,
                      }}
                    >
                      {totalDefinitions}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard.definitions')}
                    </Typography>
                  </Box>
                </Box>
              </AppCard>
            </Box>
          </Box>

          {/* Word Preview Chips */}
          <AppCard padding="compact">
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t('dashboard.freshOverline')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('dashboard.freshDesc')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: spacingTokens.element_group_gap }}>
              {recentWords.map((word) => (
                <Chip
                  key={word.id}
                  label={word.text}
                  variant="outlined"
                  sx={{
                    borderRadius: `${radiusTokens.sm}px`,
                    px: 0.75,
                    borderColor: 'divider',
                    backgroundColor: (th) =>
                      th.palette.mode === 'dark' ? alpha(th.palette.primary.main, 0.1) : '#FBFCFE',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: (th) =>
                        alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.2 : 0.04),
                    },
                  }}
                />
              ))}
            </Box>
          </AppCard>
        </Box>
      )}

      {/* STATE 3: Active Quizzing User */}
      {!isDeckEmpty && hasQuizzes && dashboardStats && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.section_vertical_gap }}>
          {/* Action Row: Start Round & Difficult Words */}
          <AppCard variant="hero" padding="compact">
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800 }}>
                  {t('dashboard.reviewDeck')}
                </Typography>
                <Typography variant="h4" component="h2" sx={{ color: 'text.primary', fontWeight: 800, mt: 0.2 }}>
                  {t('dashboard.readyTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {t('dashboard.readyDesc')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: spacingTokens.element_group_gap * 1.5, flexWrap: 'wrap' }}>
                {dashboardStats.needsAttention.length > 0 && (
                  <AppButton
                    variant="outline"
                    onClick={startQuiz}
                  >
                    {t('dashboard.practiceMistakesBtn')}
                  </AppButton>
                )}
                <AppButton
                  variant="secondary"
                  size="large"
                  onClick={startQuiz}
                  startIcon={<PlayArrowRoundedIcon />}
                  endIcon={<ArrowForwardRoundedIcon />}
                >
                  {t('dashboard.startQuizBtn')}
                </AppButton>
              </Box>
            </Box>
          </AppCard>

          {/* Two-Column Cockpit Layout */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' },
              gap: spacingTokens.element_group_gap * 2.5,
              alignItems: 'start',
            }}
          >
            {/* Left Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.element_group_gap * 2.5 }}>
              {/* Mastery Progress Bar */}
              <AppCard padding="compact">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {t('dashboard.masteryTitle')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dashboardStats.accuracy}% {t('dashboard.accuracyTitle')}
                  </Typography>
                </Box>

                {/* Visual stacked bar */}
                <Box
                  sx={{
                    display: 'flex',
                    height: 10,
                    borderRadius: 5,
                    overflow: 'hidden',
                    mb: 2,
                    backgroundColor: (th) =>
                      th.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6',
                  }}
                >
                  <Box
                    sx={{
                      width: `${totalWords > 0 ? (dashboardStats.mastery.masteredWords / totalWords) * 100 : 0}%`,
                      backgroundColor: colorTokens.learningStatus.mastered.color,
                    }}
                  />
                  <Box
                    sx={{
                      width: `${totalWords > 0 ? (dashboardStats.mastery.learningWords / totalWords) * 100 : 0}%`,
                      backgroundColor: colorTokens.learningStatus.learning.color,
                    }}
                  />
                  <Box
                    sx={{
                      width: `${totalWords > 0 ? (dashboardStats.mastery.newWords / totalWords) * 100 : 0}%`,
                      backgroundColor: (th) =>
                        th.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#E5E7EB',
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: colorTokens.learningStatus.mastered.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t('dashboard.masteredCount', { count: dashboardStats.mastery.masteredWords })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: colorTokens.learningStatus.learning.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t('dashboard.learningCount', { count: dashboardStats.mastery.learningWords })}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: '#9CA3AF',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {t('dashboard.newCount', { count: dashboardStats.mastery.newWords })}
                    </Typography>
                  </Box>
                </Box>
              </AppCard>

              {/* Needs Attention Widget */}
              <NeedsAttentionWidget items={dashboardStats.needsAttention} />

              {/* Fresh in Deck */}
              <AppCard padding="compact">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {t('dashboard.freshOverline')}
                  </Typography>
                  <Button
                    size="small"
                    onClick={openDictionary}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {t('dashboard.dictionaryBtn')}
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: spacingTokens.element_group_gap }}>
                  {recentWords.map((word) => (
                    <Chip
                      key={word.id}
                      label={word.text}
                      variant="outlined"
                      sx={{
                        borderRadius: `${radiusTokens.sm}px`,
                        px: 0.5,
                        borderColor: 'divider',
                        backgroundColor: (th) =>
                          th.palette.mode === 'dark' ? alpha(th.palette.primary.main, 0.1) : '#FBFCFE',
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Box>
              </AppCard>
            </Box>

            {/* Right Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.element_group_gap * 2.5 }}>
              <WeeklyActivityChart activity={dashboardStats.weeklyActivity} />
              <QuickAddWordCard onWordAdded={loadStats} />
            </Box>
          </Box>
        </Box>
      )}
      <CreateDictionaryDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCancel={() => setCreateDialogOpen(false)}
        onCreated={(newDict) => {
          navigate(`/${locale}/dictionary/${newDict.id}`);
        }}
      />
    </PageContainer>
  );
}
