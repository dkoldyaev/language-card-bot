import { Typography, Box, Chip, alpha } from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../../shared/api/client';
import useStore from '../../../store/useStore';
import AddWordForm from '../components/AddWordForm';
import WordList from '../components/WordList';
import DictionarySwitcher from '../components/DictionarySwitcher';
import CreateDictionaryDialog from '../components/CreateDictionaryDialog';

export default function DictionaryPage() {
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const setDictionary = useStore((state) => state.setDictionary);
  const activeDictionaryId = useStore((state) => state.activeDictionaryId);
  const selectedDictionaryId = useStore((state) => state.selectedDictionaryId);
  const setSelectedDictionaryId = useStore((state) => state.setSelectedDictionaryId);
  const dictionaries = useStore((state) => state.dictionaries);
  const setDictionaries = useStore((state) => state.setDictionaries);
  const removeDictionary = useStore((state) => state.removeDictionary);

  const currentDictId = selectedDictionaryId ?? activeDictionaryId ?? dictionaries[0]?.id ?? null;
  const currentDict = dictionaries.find((d) => d.id === currentDictId) || dictionaries[0];

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

  const handleDeleteDictionary = async (dictId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" and all its words?`)) {
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
            Vocabulary Deck
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
        <Typography variant="h1" sx={{ fontSize: { xs: '2.35rem', sm: '3rem' }, mt: 0.45 }}>
          {currentDict ? currentDict.name : 'Dictionary'}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, maxWidth: 620 }}>
          {currentDict
            ? `Learning ${currentDict.targetLanguage.toUpperCase()} with definitions and translations in ${currentDict.baseLanguage.toUpperCase()}.`
            : 'Capture new words while they are useful, then keep their meanings easy to find.'}
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
