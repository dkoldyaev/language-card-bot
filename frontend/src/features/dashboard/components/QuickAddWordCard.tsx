import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { Alert, alpha, Box, Button, Typography } from '@mui/material';
import { isAxiosError } from 'axios';
import type React from 'react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { trackEvent } from '../../../shared/lib/analytics';
import { AppButton, AppCard, AppTextField, radiusTokens, spacingTokens } from '../../../shared/ui';
import useStore from '../../../store/useStore';

interface QuickAddWordCardProps {
  onWordAdded?: (word: string) => void;
}

export default function QuickAddWordCard({ onWordAdded }: QuickAddWordCardProps) {
  const { t } = useTranslation();
  const [wordText, setWordText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successWord, setSuccessWord] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const token = useStore((state) => state.token);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const selectedDictionaryId = useStore((state) => state.selectedDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);

  const targetDictId = selectedDictionaryId ?? activeDictionaryId ?? dictionaries[0]?.id;
  const targetDict = dictionaries.find((d) => d.id === targetDictId);

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;
    const cleanWord = wordText.trim();
    if (!cleanWord || submitting || !targetDictId) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/add_word', { word: cleanWord, dictionaryId: targetDictId });
      trackEvent('Word Added');
      setSuccessWord(cleanWord);
      setWordText('');
      if (onWordAdded) onWordAdded(cleanWord);
    } catch (err: unknown) {
      console.error('Failed to quick-add word:', err);
      const message = isAxiosError<{ error?: string }>(err) ? err.response?.data?.error : undefined;
      setError(message || 'Failed to add word');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppCard padding="compact">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: spacingTokens.element_group_gap * 1.5 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'secondary.main',
            backgroundColor: alpha('#E8A17F', 0.15),
            flexShrink: 0,
          }}
        >
          <AddRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('dashboard.quickAddTitle')}
          </Typography>
          {targetDict && (
            <Typography variant="caption" color="text.secondary">
              {targetDict.name} ({targetDict.targetLanguage.toUpperCase()})
            </Typography>
          )}
        </Box>
      </Box>

      {successWord && (
        <Alert
          severity="success"
          sx={{ mb: spacingTokens.element_group_gap * 1.5, py: 0, borderRadius: `${radiusTokens.sm}px` }}
          onClose={() => setSuccessWord(null)}
        >
          {t('dashboard.quickAddSuccess', { word: successWord })}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: spacingTokens.element_group_gap * 1.5, py: 0, borderRadius: `${radiusTokens.sm}px` }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {!token ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacingTokens.element_group_gap * 1.5,
            p: spacingTokens.element_group_gap * 1.5,
            borderRadius: `${radiusTokens.md}px`,
            backgroundColor: (th) =>
              th.palette.mode === 'dark' ? alpha(th.palette.primary.main, 0.08) : '#F4F7FB',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem' }}>
            {t('dashboard.quickAddAuthNotice')}
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            size="small"
            variant="outlined"
            color="primary"
            data-testid="quick-add-login-btn"
            sx={{ whiteSpace: 'nowrap', textTransform: 'none', fontWeight: 700, borderRadius: `${radiusTokens.sm}px` }}
          >
            {t('auth.submitLogin')}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: spacingTokens.element_group_gap }}>
          <AppTextField
            size="small"
            fullWidth
            placeholder={t('dashboard.quickAddPlaceholder')}
            value={wordText}
            onChange={(e) => setWordText(e.target.value)}
            disabled={submitting}
          />
          <AppButton
            type="submit"
            variant="primary"
            size="small"
            disabled={!wordText.trim() || submitting}
            loading={submitting}
            endIcon={<SendRoundedIcon fontSize="small" />}
            sx={{ whiteSpace: 'nowrap', px: 2 }}
          >
            {t('dashboard.quickAddBtn')}
          </AppButton>
        </Box>
      )}
    </AppCard>
  );
}
