import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { alpha, Box, Tooltip, Typography } from '@mui/material';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import apiClient from '../../../shared/api/client';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import {
  AppChip,
  AppIconButton,
  colorTokens,
  PageContainer,
  radiusTokens,
  spacingTokens,
} from '../../../shared/ui';
import useStore from '../../../store/useStore';
import AddWordForm from '../components/AddWordForm';
import CreateDictionaryDialog from '../components/CreateDictionaryDialog';
import DictionaryPresets from '../components/DictionaryPresets';
import DictionarySwitcher from '../components/DictionarySwitcher';
import WordList from '../components/WordList';

export default function DictionaryPage() {
  const { t } = useTranslation();
  const loading = useStore((state) => state.isDictionaryLoading);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  const token = useStore((state) => state.token);
  const setDictionary = useStore((state) => state.setDictionary);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const setActiveDictionaryId = useStore((state) => state.setActiveDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);
  const setDictionaries = useStore((state) => state.setDictionaries);
  const removeDictionary = useStore((state) => state.removeDictionary);
  const updateDictionaryItem = useStore((state) => state.updateDictionaryItem);

  const currentDict = dictionaries.find((d) => d.id === activeDictionaryId);

  useEffect(() => {
    if (titleRef.current && currentDict) {
      titleRef.current.innerText = currentDict.name;
    }
    setIsEditingTitle(false);
  }, [currentDict?.id, currentDict?.name, currentDict]);

  useEffect(() => {
    if (!loading && dictionaries.length === 0 && !createDialogOpen) {
      setCreateDialogOpen(true);
    }
  }, [loading, dictionaries.length, createDialogOpen]);

  const handleSelectDictionary = async (dictId: number) => {
    if (!token) {
      setActiveDictionaryId(dictId);
      const dictWords = useStore.getState().guestDictionaryWords[dictId] || [];
      setDictionary(dictWords);
      return;
    }
    
    try {
      await apiClient.post(`/dictionaries/${dictId}/select`);
    } catch (error) {
      console.error('Failed to select dictionary:', error);
    }
  };

  const startEditTitle = () => {
    if (!currentDict) return;
    setIsEditingTitle(true);
    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(titleRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const saveTitle = async () => {
    if (!currentDict || isSavingTitle) return;
    const newName = titleRef.current?.innerText.trim() || '';
    if (!newName || newName === currentDict.name) {
      if (titleRef.current) {
        titleRef.current.innerText = currentDict.name;
      }
      setIsEditingTitle(false);
      return;
    }

    try {
      setIsSavingTitle(true);
      if (token) {
        await apiClient.patch(`/dictionaries/${currentDict.id}`, { name: newName });
      }
      updateDictionaryItem(currentDict.id, { name: newName });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to rename dictionary:', error);
      if (titleRef.current) {
        titleRef.current.innerText = currentDict.name;
      }
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const cancelEditTitle = () => {
    if (titleRef.current && currentDict) {
      titleRef.current.innerText = currentDict.name;
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditTitle();
    }
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLHeadingElement>) => {
    if (actionButtonsRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    saveTitle();
  };

  const handleDeleteDictionary = async (dictId: number, name: string) => {
    if (!window.confirm(t('dictionary.deleteConfirm', { name }))) {
      return;
    }

    try {
      if (token) {
        await apiClient.delete(`/dictionaries/${dictId}`);
      }
      removeDictionary(dictId);
      if (token) {
        const dictsRes = await apiClient.get('/dictionaries');
        if (dictsRes.data.dictionaries) {
          setDictionaries(dictsRes.data.dictionaries);
        }
      }
    } catch (err) {
      console.error('Failed to delete dictionary:', err);
    }
  };

  return (
    <PageContainer size="default">
      <Box sx={{ mb: spacingTokens.section_header_gap * 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: spacingTokens.header_overline_title_gap }}>
          <Typography variant="overline" color="secondary.main" sx={{ fontWeight: 800 }}>
            {t('dictionary.overline')}
          </Typography>
          {currentDict && (
            <AppChip
              variant="lang"
              label={`${currentDict.targetLanguage.toUpperCase()} → ${currentDict.baseLanguage.toUpperCase()}`}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.45, flexWrap: 'wrap' }}>
          <Typography
            ref={titleRef}
            variant="h1"
            contentEditable={isEditingTitle}
            suppressContentEditableWarning
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleBlur}
            tabIndex={isEditingTitle ? 0 : undefined}
            sx={{
              fontSize: { xs: '2.35rem', sm: '3rem' },
              lineHeight: 1.2,
              outline: isEditingTitle ? '2px solid' : 'none',
              outlineColor: 'primary.main',
              borderRadius: `${radiusTokens.sm}px`,
              px: isEditingTitle ? 1 : 0,
              py: isEditingTitle ? 0.25 : 0,
              backgroundColor: isEditingTitle ? alpha(colorTokens.brand.blue, 0.05) : 'transparent',
              transition: 'all 0.15s ease-in-out',
              cursor: isEditingTitle ? 'text' : 'inherit',
              wordBreak: 'break-word',
              minWidth: isEditingTitle ? 120 : 'auto',
            }}
          >
            {currentDict ? currentDict.name : t('dictionary.defaultTitle')}
          </Typography>

          {currentDict && (
            <Box
              ref={actionButtonsRef}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              {isEditingTitle ? (
                <>
                  <Tooltip title={t('dictionary.saveTooltip')}>
                    <span>
                      <AppIconButton
                        size="small"
                        color="primary"
                        onClick={saveTitle}
                        disabled={isSavingTitle}
                        aria-label="Save dictionary name"
                        data-testid="save-dictionary-title-btn"
                      >
                        <CheckRoundedIcon fontSize="small" />
                      </AppIconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('dictionary.cancelTooltip')}>
                    <span>
                      <AppIconButton
                        size="small"
                        onClick={cancelEditTitle}
                        disabled={isSavingTitle}
                        aria-label="Cancel editing dictionary name"
                        data-testid="cancel-dictionary-title-btn"
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </AppIconButton>
                    </span>
                  </Tooltip>
                </>
              ) : (
                <AppIconButton
                  size="small"
                  onClick={startEditTitle}
                  aria-label="Edit dictionary name"
                  data-testid="edit-dictionary-title-btn"
                  tooltip={t('dictionary.renameTooltip')}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main', backgroundColor: alpha(colorTokens.brand.blue, 0.08) },
                  }}
                >
                  <EditRoundedIcon fontSize="small" />
                </AppIconButton>
              )}
            </Box>
          )}
        </Box>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: spacingTokens.header_title_subtitle_gap, maxWidth: 620 }}>
          {currentDict
            ? t('dictionary.targetLanguageDesc', { target: currentDict.targetLanguage.toUpperCase(), base: currentDict.baseLanguage.toUpperCase() })
            : t('dictionary.defaultDesc')}
        </Typography>
      </Box>

      {dictionaries.length > 0 && (
        <DictionarySwitcher
          dictionaries={dictionaries}
          activeDictionaryId={activeDictionaryId}
          onSelectDictionary={handleSelectDictionary}
          onOpenCreateDialog={() => setCreateDialogOpen(true)}
          onDeleteDictionary={handleDeleteDictionary}
        />
      )}

      {currentDict && (
        <DictionaryPresets dictionary={currentDict} />
      )}

      <AddWordForm dictionaryId={activeDictionaryId ?? undefined} />
      
      <WordList loading={loading} />

      <CreateDictionaryDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(newDict) => {
          handleSelectDictionary(newDict.id);
        }}
      />
    </PageContainer>
  );
}
