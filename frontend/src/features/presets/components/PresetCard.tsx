import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import {
  alpha,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../../../shared/i18n';
import {
  AppButton,
  AppCard,
  AppChip,
  AppDialog,
  AppIconButton,
  radiusTokens,
} from '../../../shared/ui';
import type { PresetDefinitionItem, PresetItem, WordDefinitionPresetItem } from '../types';

interface PresetCardProps {
  preset: PresetItem;
  /** Показывать кнопку добавления в словарь */
  onAddToDictionary?: (preset: PresetItem) => void;
  /** Идёт ли добавление этого пресета сейчас */
  isAdding?: boolean;
  /** Уже добавлен (неактивная кнопка) */
  isAdded?: boolean;
  /** Нет совместимых словарей — полностью неактивный пресет */
  isIncompatible?: boolean;
  /** Для страницы словаря — кнопка "добавить в текущий словарь" */
  onAddToCurrentDictionary?: (preset: PresetItem) => void;
  /** Для страницы словаря — уже добавлен в текущий словарь */
  isAlreadyInDictionary?: boolean;
  /** Показывать admin-кнопки */
  adminActions?: React.ReactNode;
}

function getWords(body: PresetItem['body']): WordDefinitionPresetItem[] {
  return Array.isArray(body) ? body : [];
}

export default function PresetCard({
  preset,
  onAddToDictionary,
  isAdding,
  isAdded,
  isIncompatible,
  onAddToCurrentDictionary,
  isAlreadyInDictionary,
  adminActions,
}: PresetCardProps) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);

  const presetWords = getWords(preset.body);
  const previewWords = presetWords.slice(0, 5);
  const remainingCount = presetWords.length - previewWords.length;
  const langCode = (preset.for_language || preset.forLanguage || '').toLowerCase();

  const getLangLabel = (code: string) => {
    const key = `languages.${code.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : code.toUpperCase();
  };

  const addBtnTooltipText = isIncompatible
    ? t('presets.noCompatibleDictionaries')
    : isAdded
    ? t('presets.alreadyAdded')
    : '';
  const addBtn = onAddToDictionary ? (
    <Tooltip title={addBtnTooltipText}>
      <span>
        <AppButton
          variant="primary"
          size="small"
          startIcon={
            isAdding ? (
              <CircularProgress size={14} color="inherit" />
            ) : isAdded ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
            ) : (
              <AddRoundedIcon />
            )
          }
          disabled={isAdding || isAdded || isIncompatible}
          onClick={() => onAddToDictionary(preset)}
          sx={{ minWidth: 130 }}
          title={addBtnTooltipText}
        >
          {isAdded
            ? t('presets.alreadyAdded')
            : isAdding
            ? t('presets.addingToDeckBtn')
            : t('presets.addToDictionaryBtn')}
        </AppButton>
      </span>
    </Tooltip>
  ) : onAddToCurrentDictionary ? (
    <AppButton
      variant="primary"
      size="small"
      startIcon={
        isAdding ? (
          <CircularProgress size={14} color="inherit" />
        ) : isAlreadyInDictionary ? (
          <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
        ) : (
          <AddRoundedIcon />
        )
      }
      disabled={isAdding || isAlreadyInDictionary}
      onClick={() => onAddToCurrentDictionary(preset)}
      data-testid={`apply-preset-btn-${preset.id}`}
      data-tour="preset-apply-btn"
      sx={{ minWidth: 130 }}
    >
      {isAlreadyInDictionary
        ? t('presets.alreadyAdded')
        : isAdding
        ? t('presets.addingToDeckBtn')
        : t('presets.addToDeckBtn')}
    </AppButton>
  ) : null;

  return (
    <>
      <AppCard
        key={preset.id}
        data-testid={`preset-card-${preset.id}`}
        variant="interactive"
        padding="compact"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          opacity: isIncompatible ? 0.55 : 1,
          transition: 'opacity 0.2s ease',
          // ...(isIncompatible && {
          //   pointerEvents: 'none',
          //   '& button': { pointerEvents: 'none' },
          // }),
        }}
      >
        <Box>
          {/* Header row: lang chip + type */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1.25,
            }}
          >
            <AppChip variant="lang" label={getLangLabel(langCode)} />
            <Chip
              label={preset.type}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: `${radiusTokens.sm}px`,
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, lineHeight: 1.25, mb: preset.description ? 0.5 : 1 }}
          >
            {preset.title}
          </Typography>

          {/* Description */}
          {preset.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.82rem',
                mb: 1,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {preset.description}
            </Typography>
          )}

          {/* Word count */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25, fontSize: '0.8rem' }}>
            {t('presets.containsWords', { count: presetWords.length })}
          </Typography>

          {/* Word chips preview */}
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {previewWords.map((item) => (
              <Chip
                key={item.word}
                label={item.word}
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  fontSize: '0.72rem',
                  borderColor: 'divider',
                  backgroundColor: (th) =>
                    th.palette.mode === 'dark'
                      ? alpha(th.palette.common.white, 0.04)
                      : '#F9FAFB',
                }}
              />
            ))}
            {remainingCount > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ alignSelf: 'center', ml: 0.5 }}
              >
                {t('presets.moreWords', { count: remainingCount })}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Footer actions */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 1.5,
            mt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <AppIconButton
            size="small"
            tooltip={t('presets.previewWordsBtn')}
            onClick={() => setPreviewOpen(true)}
            sx={{ color: 'text.secondary' }}
          >
            <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
          </AppIconButton>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {adminActions}
            {addBtn}
          </Box>
        </Box>
      </AppCard>

      {/* Preview dialog */}
      <AppDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        title={
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {preset.title}
            </Typography>
            {preset.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {preset.description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('presets.previewLangInfo', {
                lang: langCode.toUpperCase(),
                count: presetWords.length,
              })}
            </Typography>
          </Box>
        }
        dividers
        actions={
          <>
            <AppButton variant="ghost" onClick={() => setPreviewOpen(false)}>
              {t('presets.closeBtn')}
            </AppButton>
            {addBtn && (
              <Box
                onClick={() => setPreviewOpen(false)}
                sx={{ display: 'contents' }}
              >
                {addBtn}
              </Box>
            )}
          </>
        }
      >
        <List sx={{ py: 0 }}>
          {presetWords.map((item) => (
            <Box key={item.word}>
              <ListItem sx={{ py: 1.25, px: 2 }}>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {item.word}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {item.definitions
                        ?.map((d: PresetDefinitionItem) => {
                          if (typeof d === 'string') return d;
                          if (d && typeof d === 'object' && typeof d.text === 'string') {
                            return d.text;
                          }
                          return '';
                        })
                        .filter(Boolean)
                        .join('; ') || t('presets.noDefinitions')}
                    </Typography>
                  }
                />
              </ListItem>
              {/* {idx < presetWords.length - 1 && <Divider />} */}
            </Box>
          ))}
        </List>
      </AppDialog>
    </>
  );
}
