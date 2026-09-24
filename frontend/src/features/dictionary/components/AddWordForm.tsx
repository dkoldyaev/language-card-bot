import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { alpha, Box, Typography } from '@mui/material';
import { useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import { trackEvent } from '../../../shared/lib/analytics';
import { AppButton, AppCard, AppTextField, spacingTokens } from '../../../shared/ui';
import useStore from '../../../store/useStore';
import { addGuestWordsLocally } from '../lib/guestDictionaryService';

interface AddWordFormProps {
  dictionaryId?: number;
}

export default function AddWordForm({ dictionaryId }: AddWordFormProps = {}) {
  const { t } = useTranslation();
  const [wordsText, setWordsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = useStore((state) => state.token);
  const selectedDictionaryId = useStore((state) => state.selectedDictionaryId);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);

  const targetDictId = dictionaryId ?? selectedDictionaryId ?? activeDictionaryId ?? dictionaries[0]?.id;
  const targetDict = dictionaries.find((d) => d.id === targetDictId);

  const handleSubmitWords = async () => {
    const words = wordsText.split('\n').map((w) => w.trim()).filter(Boolean);
    if (words.length === 0) return;

    setSubmitting(true);
    try {
      if (!token) {
        if (targetDict) {
          await addGuestWordsLocally(words, targetDict);
        }
      } else {
        await apiClient.post('/add_word/batch', { words, dictionaryId: targetDictId });
      }
      trackEvent('Word Added');
      setWordsText('');
    } catch (error) {
      console.error('Failed to add words:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppCard
      padding="normal"
      sx={{ mb: spacingTokens.section_vertical_gap }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: spacingTokens.element_group_gap * 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'secondary.dark',
            backgroundColor: (th) =>
              th.palette.mode === 'dark' ? alpha(th.palette.secondary.main, 0.15) : '#FBE8E0',
            flexShrink: 0,
          }}
        >
          <AddRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {targetDict ? t('dictionary.addWordsToDeck', { name: targetDict.name }) : t('dictionary.addWords')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {targetDict ? t('dictionary.targetLangPrefix', { lang: targetDict.targetLanguage.toUpperCase() }) : ''}
            {t('dictionary.oneWordPerLine')}
          </Typography>
        </Box>
      </Box>

      <AppTextField
        label={t('dictionary.wordsToAddLabel')}
        multiline
        rows={4}
        fullWidth
        value={wordsText}
        onChange={(e) => setWordsText(e.target.value)}
        placeholder={t('dictionary.placeholderWords')}
        disabled={submitting}
        helperText={t('dictionary.helperText')}
        sx={{ mb: spacingTokens.element_group_gap * 2 }}
      />

      <AppButton
        variant="primary"
        disabled={!wordsText.trim() || submitting}
        loading={submitting}
        onClick={handleSubmitWords}
        endIcon={<SendRoundedIcon />}
      >
        {submitting ? t('dictionary.submittingBtn') : t('dictionary.submitWordsBtn')}
      </AppButton>
    </AppCard>
  );
}
