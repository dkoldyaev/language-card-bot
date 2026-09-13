import { Typography, Box, Chip, IconButton, Tooltip, alpha } from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useEffect, useState, useRef } from 'react';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import { useTranslation } from '../../../shared/i18n/I18nContext';
import AddWordForm from '../components/AddWordForm';
import WordList from '../components/WordList';
import DictionarySwitcher from '../components/DictionarySwitcher';
import CreateDictionaryDialog from '../components/CreateDictionaryDialog';
import DictionaryPresets from '../components/DictionaryPresets';

export default function DictionaryPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  const setDictionary = useStore((state) => state.setDictionary);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const selectedDictionaryId = useStore((state) => state.selectedDictionaryId);
  const setSelectedDictionaryId = useStore((state) => state.setSelectedDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);
  const setDictionaries = useStore((state) => state.setDictionaries);
  const removeDictionary = useStore((state) => state.removeDictionary);
  const updateDictionaryItem = useStore((state) => state.updateDictionaryItem);

  const currentDictId = selectedDictionaryId ?? activeDictionaryId ?? dictionaries[0]?.id ?? null;
  const currentDict = dictionaries.find((d) => d.id === currentDictId) || dictionaries[0];

  useEffect(() => {
    if (titleRef.current && currentDict) {
      titleRef.current.innerText = currentDict.name;
    }
    setIsEditingTitle(false);
  }, [currentDict?.id, currentDict?.name]);

  useEffect(() => {
    if (!currentDictId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiClient.get('/dictionary', { params: { dictionaryId: currentDictId } })
      .then((res) => {
        if (res.data.dictionary) {
          setDictionary(res.data.dictionary);
        }
      })
      .catch((error) => console.error('Failed to load dictionary:', error))
      .finally(() => setLoading(false));
  }, [setDictionary, currentDictId]);

  const handleSelectDictionary = (dictId: number) => {
    // Only switch working dictionary, do NOT switch active learning language
    setSelectedDictionaryId(dictId);
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
      await apiClient.patch(`/dictionaries/${currentDict.id}`, { name: newName });
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
      await apiClient.delete(`/dictionaries/${dictId}`);
      removeDictionary(dictId);
      const dictsRes = await apiClient.get('/dictionaries');
      if (dictsRes.data.dictionaries) {
        setDictionaries(dictsRes.data.dictionaries);
      }
    } catch (err) {
      console.error('Failed to delete dictionary:', err);
    }
  };

  return (
    <Box className="animate-fade-in">
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography variant="overline" color="secondary.main">
            {t('dictionary.overline')}
          </Typography>
          {currentDict && (
            <Chip
              label={`${currentDict.targetLanguage.toUpperCase()} → ${currentDict.baseLanguage.toUpperCase()}`}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: alpha('#2453A6', 0.1),
                color: 'primary.dark',
              }}
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
              borderRadius: 1.5,
              px: isEditingTitle ? 1 : 0,
              py: isEditingTitle ? 0.25 : 0,
              backgroundColor: isEditingTitle ? alpha('#2453A6', 0.05) : 'transparent',
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
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={saveTitle}
                        disabled={isSavingTitle}
                        aria-label="Save dictionary name"
                        data-testid="save-dictionary-title-btn"
                      >
                        <CheckRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('dictionary.cancelTooltip')}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={cancelEditTitle}
                        disabled={isSavingTitle}
                        aria-label="Cancel editing dictionary name"
                        data-testid="cancel-dictionary-title-btn"
                      >
                        <CloseRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              ) : (
                <Tooltip title={t('dictionary.renameTooltip')}>
                  <IconButton
                    size="small"
                    onClick={startEditTitle}
                    aria-label="Edit dictionary name"
                    data-testid="edit-dictionary-title-btn"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': { color: 'primary.main', backgroundColor: alpha('#2453A6', 0.08) },
                    }}
                  >
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 620 }}>
          {currentDict
            ? t('dictionary.targetLanguageDesc', { target: currentDict.targetLanguage.toUpperCase(), base: currentDict.baseLanguage.toUpperCase() })
            : t('dictionary.defaultDesc')}
        </Typography>
      </Box>

      {dictionaries.length > 0 && (
        <DictionarySwitcher
          dictionaries={dictionaries}
          selectedDictionaryId={currentDictId}
          activeDictionaryId={activeDictionaryId}
          onSelectDictionary={handleSelectDictionary}
          onOpenCreateDialog={() => setCreateDialogOpen(true)}
          onDeleteDictionary={handleDeleteDictionary}
        />
      )}

      {currentDict && (
        <DictionaryPresets dictionary={currentDict} />
      )}

      <AddWordForm dictionaryId={currentDictId ?? undefined} />
      
      <WordList loading={loading} />

      <CreateDictionaryDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(newDict) => {
          setSelectedDictionaryId(newDict.id);
        }}
      />
    </Box>
  );
}
