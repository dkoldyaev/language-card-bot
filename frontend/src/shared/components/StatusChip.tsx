import { Chip, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/I18nContext';

type MercureWordItem = string | { word?: string };

function wordMatches(item: MercureWordItem, word: string): boolean {
  const value = typeof item === 'string' ? item : item.word;
  return value?.toLowerCase() === word.toLowerCase();
}

export default function StatusChip({ word, isProcessing }: { word: string; isProcessing?: boolean }) {
  const { t } = useTranslation();
  const [eventStatus, setEventStatus] = useState<string | undefined>();
  const [eventVisible, setEventVisible] = useState(false);

  useEffect(() => {
    const handleEvent = (e: CustomEvent) => {
      const data = e.detail;
      if (data.type === 'dictionary_add_duplicate') {
        const isDuplicate = Array.isArray(data.words)
          ? data.words.some((w: string) => w.toLowerCase() === word.toLowerCase())
          : (typeof data.word === 'string' && data.word.toLowerCase() === word.toLowerCase());
        if (isDuplicate) {
          setEventStatus('duplicate');
        }
      } else if (data.type === 'dictionary_add_processing') {
        const isProcessingEvent = Array.isArray(data.words)
          ? data.words.some((w: MercureWordItem) => wordMatches(w, word))
          : false;
        if (isProcessingEvent) {
          setEventStatus('processing');
        }
      } else if (data.type === 'dictionary_add_definitions_received') {
        const isReceived = Array.isArray(data.words)
          ? data.words.some((w: MercureWordItem) => wordMatches(w, word))
          : false;
        if (isReceived) {
          setEventStatus('definitions_received');
        }
      }
    };

    window.addEventListener('mercure-word-status', handleEvent as EventListener);
    return () => {
      window.removeEventListener('mercure-word-status', handleEvent as EventListener);
    };
  }, [word]);

  useEffect(() => {
    if (!eventStatus) return;
    setEventVisible(true);

    if (eventStatus === 'processing') {
      return;
    }

    const timeoutId = setTimeout(() => {
      setEventVisible(false);
      setEventStatus(undefined);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [eventStatus]);

  const activeStatus = isProcessing ? 'processing' : eventStatus;
  const isVisible = isProcessing || eventVisible;

  if (!activeStatus || !isVisible) return null;

  let label = activeStatus;
  let icon: React.ReactElement | undefined;
  let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';

  switch (activeStatus) {
    case 'processing':
      label = t('common.fetching');
      icon = <CircularProgress size={14} color="inherit" />;
      color = 'primary';
      break;
    case 'definitions_received':
      label = t('common.processingDefinitions');
      icon = <CircularProgress size={14} color="inherit" />;
      color = 'info';
      break;
    case 'duplicate':
      label = t('common.duplicate');
      color = 'warning';
      break;
  }

  return (
    <Chip
      size="small"
      label={label}
      color={color}
      icon={icon}
      sx={{ mr: 1, fontWeight: 600, fontSize: '0.7rem' }}
    />
  );
}
