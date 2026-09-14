import { Box, Card, CardContent, Typography, alpha, Tooltip } from '@mui/material';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import { type DayActivity } from '../../../store/useStore';
import { useTranslation } from '../../../shared/i18n/I18nContext';

interface WeeklyActivityChartProps {
  activity: DayActivity[];
}

export default function WeeklyActivityChart({ activity }: WeeklyActivityChartProps) {
  const { t } = useTranslation();
  const maxCount = Math.max(...activity.map((d) => d.count), 5);

  return (
    <Card sx={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 2.5 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: alpha('#3A86FF', 0.12),
              color: '#3A86FF',
            }}
          >
            <BarChartRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t('dashboard.weeklyTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('dashboard.weeklyCards')}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            height: 120,
            pt: 2,
            px: 1,
            gap: 1,
          }}
        >
          {activity.map((day, idx) => {
            const heightPercent = Math.max(8, Math.round((day.count / maxCount) * 100));
            const isToday = idx === activity.length - 1;

            return (
              <Tooltip key={day.date} title={`${day.date}: ${day.count} cards`} arrow>
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: day.count > 0 ? 'text.primary' : 'transparent',
                      mb: 0.5,
                    }}
                  >
                    {day.count > 0 ? day.count : '0'}
                  </Typography>

                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: 28,
                      height: `${heightPercent}%`,
                      borderRadius: '6px 6px 2px 2px',
                      backgroundColor: isToday ? '#2453A6' : day.count > 0 ? alpha('#2453A6', 0.6) : '#E5E7EB',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: '#E8A17F',
                      },
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      mt: 1,
                      fontSize: '0.72rem',
                      fontWeight: isToday ? 800 : 500,
                      color: isToday ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {day.dayLabel}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
