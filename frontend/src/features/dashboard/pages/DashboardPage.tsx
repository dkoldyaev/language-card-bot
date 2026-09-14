import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import useStore from '../../../store/useStore';
import DictionaryPresets from '../../dictionary/components/DictionaryPresets';
import { fetchDashboardStats } from '../api/dashboard.api';
import DashboardKpiBar from '../components/DashboardKpiBar';
import NeedsAttentionWidget from '../components/NeedsAttentionWidget';
import QuickAddWordCard from '../components/QuickAddWordCard';
import WeeklyActivityChart from '../components/WeeklyActivityChart';

export default function Dashboard() {
  const { t } = useTranslation();
  const profile = useStore((state) => state.profile);
  const dictionary = useStore((state) => state.dictionary);
  const dictionaries = useStore((state) => state.dictionaries);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const dashboardStats = useStore((state) => state.dashboardStats);
  const setDashboardStats = useStore((state) => state.setDashboardStats);
  const navigate = useNavigate();

  const totalWords = dictionary.length;
  const totalDefinitions = dictionary.reduce((sum, word) => sum + word.definitions.length, 0);
  const recentWords = dictionary.slice(-6).reverse();

  const targetDictId = activeDictionaryId ?? dictionaries[0]?.id;
  const activeDict = dictionaries.find((d) => d.id === targetDictId);

  const loadStats = () => {
    fetchDashboardStats(targetDictId)
      .then((stats) => {
        setDashboardStats(stats);
      })
      .catch((e) => {
        console.error('Failed to load dashboard stats:', e);
      });
  };

  useEffect(() => {
    loadStats();
  }, [activeDictionaryId, totalWords]);

  const hasQuizzes = (dashboardStats?.totalAttempts ?? 0) > 0;
  const isDeckEmpty = totalWords === 0;

  return (
    <Box className="animate-fade-in" sx={{ pb: 6 }}>
      {/* Header Greeting */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 700 }}>
          {t('dashboard.overline')}
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2.2rem', sm: '3rem' }, mt: 0.5, fontWeight: 800 }}>
          {profile ? t('dashboard.welcomeUser', { name: profile.username }) : t('dashboard.welcomeGuest')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640, mt: 1 }}>
          {t('dashboard.desc')}
        </Typography>
      </Box>

      {/* KPI Bar for Active Users */}
      {hasQuizzes && dashboardStats && <DashboardKpiBar stats={dashboardStats} />}

      {/* STATE 1: Empty Dictionary (Onboarding) */}
      {isDeckEmpty && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          {/* Main Action Card (ensures E2E test locator matches) */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' },
              gap: 2.5,
              alignItems: 'stretch',
            }}
          >
            <Card
              sx={{
                color: '#FFFFFF',
                backgroundColor: '#172033',
                border: 'none',
                borderRadius: 3,
                boxShadow: '0 18px 38px rgba(23, 32, 51, 0.16)',
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                <Typography variant="overline" sx={{ color: '#E8A17F', fontWeight: 700 }}>
                  {t('dashboard.readyOverline')}
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', mt: 0.4, mb: 1, fontWeight: 800 }}>
                  {t('dashboard.readyTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.75), maxWidth: 460, mb: 3 }}>
                  {t('dashboard.readyEmptyDesc')}
                </Typography>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate('/quiz')}
                  disabled={true}
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ borderRadius: 2, px: 2.5, py: 1 }}
                >
                  {t('dashboard.startQuizBtn')}
                </Button>
              </CardContent>
            </Card>

            <QuickAddWordCard onWordAdded={loadStats} />
          </Box>

          {/* 3 Step Guidance Card */}
          <Card sx={{ backgroundColor: (th) => th.palette.mode === 'dark' ? 'background.paper' : '#F8FAFC', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                {t('dashboard.onboardingTitle')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleRoundedIcon sx={{ color: '#2A9D8F' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t('dashboard.step1', { name: activeDict?.name || 'Default' })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: alpha('#2453A6', 0.1), color: 'primary.main', display: 'grid', placeItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.step2')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#E2E8F0', color: '#64748B', display: 'grid', placeItems: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.step3')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Starter Presets Section */}
          {activeDict && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, textTransform: 'uppercase', color: 'text.secondary' }}>
                {t('dashboard.starterPacksTitle')}
              </Typography>
              <DictionaryPresets dictionary={activeDict} onPresetApplied={loadStats} />
            </Box>
          )}
        </Box>
      )}

      {/* STATE 2: Words Added, No Quizzes Yet */}
      {!isDeckEmpty && !hasQuizzes && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' },
              gap: 2.5,
              alignItems: 'stretch',
            }}
          >
            <Card
              sx={{
                color: '#FFFFFF',
                backgroundColor: '#172033',
                border: 'none',
                borderRadius: 3,
                boxShadow: '0 18px 38px rgba(23, 32, 51, 0.16)',
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                <Typography variant="overline" sx={{ color: '#E8A17F', fontWeight: 700 }}>
                  {t('dashboard.readyHeroTitle')}
                </Typography>
                <Typography variant="h3" sx={{ color: '#FFFFFF', mt: 0.5, mb: 1, fontSize: { xs: '1.8rem', sm: '2.2rem' }, fontWeight: 800 }}>
                  {t('dashboard.readyTitle')}
                </Typography>
                <Typography variant="body1" sx={{ color: alpha('#FFFFFF', 0.8), maxWidth: 480, mb: 3 }}>
                  {t('dashboard.readyHeroDesc', { count: totalWords })}
                </Typography>

                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => navigate('/quiz')}
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ borderRadius: 2, px: 3.5, py: 1.25, fontWeight: 700 }}
                >
                  {t('dashboard.startQuizBtn')}
                </Button>
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <QuickAddWordCard onWordAdded={loadStats} />

              <Card sx={{ backgroundColor: '#FFFDF9', border: '1px solid #F0ECE1', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('dashboard.yourDeck')}
                    </Typography>
                    <Button size="small" onClick={() => navigate('/dictionary')} startIcon={<TranslateRoundedIcon fontSize="small" />}>
                      {t('dashboard.manageVocabulary')}
                    </Button>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="h4" sx={{ color: 'primary.dark', fontWeight: 800 }}>
                        {totalWords}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{t('dashboard.wordsSaved')}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ color: 'primary.dark', fontWeight: 800 }}>
                        {totalDefinitions}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{t('dashboard.definitions')}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Word Preview Chips */}
          <Card sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
                {t('dashboard.freshOverline')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('dashboard.freshDesc')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {recentWords.map((word) => (
                  <Chip
                    key={word.id}
                    label={word.text}
                    variant="outlined"
                    sx={{
                      px: 0.75,
                      py: 0.5,
                      borderColor: 'divider',
                      backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.primary.main, 0.1) : '#FBFCFE',
                      fontWeight: 600,
                      '&:hover': { borderColor: 'primary.main', backgroundColor: (th) => alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.2 : 0.04) },
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* STATE 3: Active Quizzing User */}
      {!isDeckEmpty && hasQuizzes && dashboardStats && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Action Row: Start Round & Difficult Words */}
          <Card
            sx={{
              backgroundColor: '#172033',
              color: '#FFFFFF',
              borderRadius: 3,
              boxShadow: '0 12px 30px rgba(23, 32, 51, 0.12)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3 }, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ color: '#E8A17F', fontWeight: 700 }}>
                  {t('dashboard.reviewDeck')}
                </Typography>
                <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 800, mt: 0.2 }}>
                  {t('dashboard.readyTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.75), mt: 0.5 }}>
                  {t('dashboard.readyDesc')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {dashboardStats.needsAttention.length > 0 && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate('/quiz')}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    {t('dashboard.practiceMistakesBtn')}
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  onClick={() => navigate('/quiz')}
                  startIcon={<PlayArrowRoundedIcon />}
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{ borderRadius: 2, px: 3, fontWeight: 800 }}
                >
                  {t('dashboard.startQuizBtn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Two-Column Cockpit Layout */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            {/* Left Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Mastery Progress Bar */}
              <Card sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {t('dashboard.masteryTitle')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dashboardStats.accuracy}% {t('dashboard.accuracyTitle')}
                    </Typography>
                  </Box>

                  {/* Visual stacked bar */}
                  <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mb: 2, backgroundColor: (th) => th.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6' }}>
                    <Box
                      sx={{
                        width: `${totalWords > 0 ? (dashboardStats.mastery.masteredWords / totalWords) * 100 : 0}%`,
                        backgroundColor: '#2A9D8F',
                      }}
                    />
                    <Box
                      sx={{
                        width: `${totalWords > 0 ? (dashboardStats.mastery.learningWords / totalWords) * 100 : 0}%`,
                        backgroundColor: '#3A86FF',
                      }}
                    />
                    <Box
                      sx={{
                        width: `${totalWords > 0 ? (dashboardStats.mastery.newWords / totalWords) * 100 : 0}%`,
                        backgroundColor: (th) => th.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#E5E7EB',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2A9D8F' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {t('dashboard.masteredCount', { count: dashboardStats.mastery.masteredWords })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3A86FF' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {t('dashboard.learningCount', { count: dashboardStats.mastery.learningWords })}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#9CA3AF' }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {t('dashboard.newCount', { count: dashboardStats.mastery.newWords })}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Needs Attention Widget */}
              <NeedsAttentionWidget items={dashboardStats.needsAttention} />

              {/* Fresh in Deck */}
              <Card sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {t('dashboard.freshOverline')}
                    </Typography>
                    <Button size="small" onClick={() => navigate('/dictionary')}>
                      {t('dashboard.dictionaryBtn')}
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {recentWords.map((word) => (
                      <Chip
                        key={word.id}
                        label={word.text}
                        variant="outlined"
                        sx={{
                          px: 0.5,
                          borderColor: 'divider',
                          backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.primary.main, 0.1) : '#FBFCFE',
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Right Column */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <WeeklyActivityChart activity={dashboardStats.weeklyActivity} />
              <QuickAddWordCard onWordAdded={loadStats} />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
