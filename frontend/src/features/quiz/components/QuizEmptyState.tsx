import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import { alpha, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n';
import { AppButton, AppCard, colorTokens, spacingTokens } from '../../../shared/ui';

export default function QuizEmptyState() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const emptyBenefits = [
    t('quiz.emptyBenefit1'),
    t('quiz.emptyBenefit2'),
    t('quiz.emptyBenefit3'),
  ];

  return (
    <Box
      className="animate-fade-in"
      sx={{
        minHeight: { xs: 'auto', md: '68vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: spacingTokens.page_outer_vertical_padding,
      }}
    >
      <AppCard padding="none" sx={{ width: '100%', maxWidth: 880, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' } }}>
          <Box
            sx={{
              minHeight: { xs: 200, md: 400 },
              p: spacingTokens.block_inner_padding_spacious,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: (th) =>
                th.palette.mode === 'dark' ? colorTokens.hero.darkBg : colorTokens.hero.lightBg,
              color: colorTokens.hero.text,
            }}
          >
            <Box
              sx={{
                width: 54,
                height: 54,
                display: 'grid',
                placeItems: 'center',
                color: colorTokens.brand.ink,
                backgroundColor: colorTokens.hero.accent,
                borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ mt: { xs: 3, md: 0 } }}>
              <Typography variant="overline" sx={{ color: colorTokens.hero.accent, fontWeight: 800 }}>
                {t('quiz.lockedOverline')}
              </Typography>
              <Typography variant="h3" sx={{ color: '#FFFFFF', mt: 0.5, maxWidth: 280, fontWeight: 800 }}>
                {t('quiz.lockedTitle')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: spacingTokens.block_inner_padding_spacious, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800 }}>
              {t('quiz.vocabNeededOverline')}
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', sm: '2.55rem' }, mt: 0.5, mb: 1.25, fontWeight: 800 }}>
              {t('quiz.dictionaryEmptyTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, mb: 3 }}>
              {t('quiz.emptyQuizDesc')}
            </Typography>
            <Box sx={{ display: 'grid', gap: spacingTokens.element_group_gap * 1.5, mb: 3.5 }}>
              {emptyBenefits.map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      color: 'primary.main',
                      backgroundColor: alpha(colorTokens.brand.blue, 0.12),
                      flexShrink: 0,
                    }}
                  >
                    <CheckRoundedIcon sx={{ fontSize: 15 }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item}</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              <AppButton
                variant="primary"
                size="large"
                onClick={() => navigate('/dictionary')}
                startIcon={<MenuBookRoundedIcon />}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                {t('quiz.goToDictionaryBtn')}
              </AppButton>
            </Box>
          </Box>
        </Box>
      </AppCard>
    </Box>
  );
}
