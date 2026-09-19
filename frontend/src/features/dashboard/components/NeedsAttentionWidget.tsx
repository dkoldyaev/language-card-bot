import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { alpha, Box, Chip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { AppButton, AppCard, colorTokens, radiusTokens, spacingTokens } from '../../../shared/ui';
import type { NeedsAttentionWord } from '../../../store/useStore';

interface NeedsAttentionWidgetProps {
  items: NeedsAttentionWord[];
}

export default function NeedsAttentionWidget({ items }: NeedsAttentionWidgetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <AppCard padding="compact">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: alpha(colorTokens.learningStatus.mastered.color, 0.12),
              color: colorTokens.learningStatus.mastered.color,
              flexShrink: 0,
            }}
          >
            <CheckCircleOutlineRoundedIcon />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t('dashboard.needsAttentionTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.noMistakes')}
            </Typography>
          </Box>
        </Box>
      </AppCard>
    );
  }

  return (
    <AppCard padding="compact">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: spacingTokens.element_group_gap * 2,
          gap: spacingTokens.element_group_gap,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: alpha(colorTokens.learningStatus.attention.color, 0.12),
              color: colorTokens.learningStatus.attention.color,
              flexShrink: 0,
            }}
          >
            <WarningAmberRoundedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              {t('dashboard.needsAttentionTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-block', lineHeight: 1 }}>
              {t('dashboard.needsAttentionDesc', { count: items.length })}
            </Typography>
          </Box>
        </Box>
        <AppButton
          size="small"
          variant="outline"
          startIcon={<SchoolRoundedIcon fontSize="small" />}
          onClick={() => navigate('/quiz')}
        >
          {t('dashboard.practiceMistakesBtn')}
        </AppButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacingTokens.element_group_gap }}>
        {items.map((item) => (
          <Box
            key={item.wordId}
            sx={{
              p: spacingTokens.element_group_gap * 1.25,
              borderRadius: `${radiusTokens.md}px`,
              backgroundColor: (th) =>
                th.palette.mode === 'dark' ? alpha(th.palette.common.white, 0.04) : '#F9FAFB',
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
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
                  {item.translation}
                </Typography>
              ) : item.definition ? (
                <Typography variant="caption" color="text.secondary">
                  {item.definition}
                </Typography>
              ) : null}
            </Box>

            <Chip
              size="small"
              label={`${item.errorCount} ⚠️`}
              sx={{
                borderRadius: `${radiusTokens.sm}px`,
                backgroundColor: alpha(colorTokens.learningStatus.attention.color, 0.12),
                color: colorTokens.learningStatus.attention.color,
                fontWeight: 700,
                fontSize: '0.75rem',
              }}
            />
          </Box>
        ))}
      </Box>
    </AppCard>
  );
}
