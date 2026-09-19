import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import { alpha, Box } from '@mui/material';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { colorTokens, StatCard, spacingTokens } from '../../../shared/ui';
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
      icon: (
        <LocalFireDepartmentRoundedIcon
          sx={{
            fontSize: 24,
            color: stats.streak > 0 ? colorTokens.learningStatus.streak.color : '#9CA3AF',
          }}
        />
      ),
      iconBg:
        stats.streak > 0
          ? alpha(colorTokens.learningStatus.streak.color, 0.12)
          : alpha('#9CA3AF', 0.12),
      title: t('dashboard.streakTitle'),
      value:
        stats.streak > 0
          ? t('dashboard.streakDays', { count: stats.streak })
          : t('dashboard.streakStart'),
      subtitle: t('dashboard.streakDesc'),
      dataTestId: 'kpi-streak',
    },
    {
      icon: (
        <TrackChangesRoundedIcon
          sx={{ fontSize: 24, color: colorTokens.learningStatus.mastered.color }}
        />
      ),
      iconBg: alpha(colorTokens.learningStatus.mastered.color, 0.12),
      title: t('dashboard.todayGoal'),
      value:
        stats.todayCount >= DAILY_TARGET
          ? t('dashboard.todayDone')
          : t('dashboard.todayCards', { count: stats.todayCount, target: DAILY_TARGET }),
      progress: todayProgress,
      progressColor: colorTokens.learningStatus.mastered.color,
      dataTestId: 'kpi-today-goal',
    },
    {
      icon: (
        <PsychologyRoundedIcon
          sx={{ fontSize: 24, color: colorTokens.learningStatus.learning.color }}
        />
      ),
      iconBg: alpha(colorTokens.learningStatus.learning.color, 0.12),
      title: t('dashboard.masteryTitle'),
      value: t('dashboard.masteredCount', { count: stats.mastery.masteredWords }),
      subtitle: `${t('dashboard.learningCount', { count: stats.mastery.learningWords })} • ${t('dashboard.newCount', { count: stats.mastery.newWords })}`,
      dataTestId: 'kpi-mastery',
    },
    {
      icon: (
        <MenuBookRoundedIcon
          sx={{ fontSize: 24, color: colorTokens.learningStatus.preset.color }}
        />
      ),
      iconBg: alpha(colorTokens.learningStatus.preset.color, 0.12),
      title: t('dashboard.yourDeck'),
      value: `${stats.totalWords} ${t('dashboard.wordsSaved')}`,
      subtitle: `${stats.totalDefinitions} ${t('dashboard.definitions')}`,
      dataTestId: 'kpi-deck',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: spacingTokens.element_group_gap * 2,
        mb: spacingTokens.section_vertical_gap,
      }}
    >
      {items.map((item) => (
        <StatCard
          key={item.dataTestId}
          icon={item.icon}
          iconBg={item.iconBg}
          title={item.title}
          value={item.value}
          subtitle={item.subtitle}
          progress={item.progress}
          progressColor={item.progressColor}
          dataTestId={item.dataTestId}
        />
      ))}
    </Box>
  );
}
