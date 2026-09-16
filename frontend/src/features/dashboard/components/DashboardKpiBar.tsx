import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import { alpha, Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import type { DashboardStats } from '../../../store/useStore';

interface DashboardKpiBarProps {
  stats: DashboardStats;
}

export default function DashboardKpiBar({ stats }: DashboardKpiBarProps) {
  const { t } = useTranslation();
  const DAILY_TARGET = 15;
  const todayProgress = Math.min(100, Math.round((stats.todayCount / DAILY_TARGET) * 100));

  const items = [
    {
      icon: <LocalFireDepartmentRoundedIcon sx={{ fontSize: 24, color: stats.streak > 0 ? '#E85D04' : '#9CA3AF' }} />,
      bgColor: stats.streak > 0 ? alpha('#E85D04', 0.12) : alpha('#9CA3AF', 0.12),
      title: t('dashboard.streakTitle'),
      value: stats.streak > 0 ? t('dashboard.streakDays', { count: stats.streak }) : t('dashboard.streakStart'),
      subtitle: t('dashboard.streakDesc'),
      highlight: stats.streak > 0,
    },
    {
      icon: <TrackChangesRoundedIcon sx={{ fontSize: 24, color: '#2A9D8F' }} />,
      bgColor: alpha('#2A9D8F', 0.12),
      title: t('dashboard.todayGoal'),
      value: stats.todayCount >= DAILY_TARGET ? t('dashboard.todayDone') : t('dashboard.todayCards', { count: stats.todayCount, target: DAILY_TARGET }),
      progress: todayProgress,
    },
    {
      icon: <PsychologyRoundedIcon sx={{ fontSize: 24, color: '#3A86FF' }} />,
      bgColor: alpha('#3A86FF', 0.12),
      title: t('dashboard.masteryTitle'),
      value: t('dashboard.masteredCount', { count: stats.mastery.masteredWords }),
      subtitle: `${t('dashboard.learningCount', { count: stats.mastery.learningWords })} • ${t('dashboard.newCount', { count: stats.mastery.newWords })}`,
    },
    {
      icon: <MenuBookRoundedIcon sx={{ fontSize: 24, color: '#8338EC' }} />,
      bgColor: alpha('#8338EC', 0.12),
      title: t('dashboard.yourDeck'),
      value: `${stats.totalWords} ${t('dashboard.wordsSaved')}`,
      subtitle: `${stats.totalDefinitions} ${t('dashboard.definitions')}`,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3.5,
      }}
    >
      {items.map((item, index) => (
        <Card
          key={index}
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            transition: 'transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.06)',
            },
          }}
        >
          <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.25 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  backgroundColor: item.bgColor,
                }}
              >
                {item.icon}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                {item.title}
              </Typography>
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
              {item.value}
            </Typography>

            {item.progress !== undefined ? (
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={item.progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: alpha('#2A9D8F', 0.15),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2A9D8F',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {item.subtitle}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
