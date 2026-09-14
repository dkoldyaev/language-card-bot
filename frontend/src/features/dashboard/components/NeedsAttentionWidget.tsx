import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { alpha, Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import type { NeedsAttentionWord } from '../../../store/useStore';

interface NeedsAttentionWidgetProps {
  items: NeedsAttentionWord[];
}

export default function NeedsAttentionWidget({ items }: NeedsAttentionWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Card sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2.5,
              display: 'grid',
              placeItems: 'center',
              backgroundColor: alpha('#2A9D8F', 0.12),
              color: '#2A9D8F',
            }}
          >
            <CheckCircleOutlineRoundedIcon />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('dashboard.needsAttentionTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.noMistakes')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                backgroundColor: alpha('#E76F51', 0.12),
                color: '#E76F51',
              }}
            >
              <WarningAmberRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {t('dashboard.needsAttentionTitle')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.needsAttentionDesc', { count: items.length })}
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<SchoolRoundedIcon fontSize="small" />}
            onClick={() => navigate('/quiz')}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {t('dashboard.practiceMistakesBtn')}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((item) => (
            <Box
              key={item.wordId}
              sx={{
                p: 1.25,
                borderRadius: 2,
                backgroundColor: (th) => th.palette.mode === 'dark' ? alpha(th.palette.common.white, 0.04) : '#F9FAFB',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ minWidth: 0, mr: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {item.text}
                </Typography>
                {item.translation ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }} noWrap>
                    {item.translation}
                  </Typography>
                ) : item.definition ? (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {item.definition}
                  </Typography>
                ) : null}
              </Box>

              <Chip
                size="small"
                label={`${item.errorCount} ⚠️`}
                sx={{
                  backgroundColor: alpha('#E76F51', 0.12),
                  color: '#E76F51',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
