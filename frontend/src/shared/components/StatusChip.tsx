import { useState, useEffect } from 'react';
import { Chip, CircularProgress } from '@mui/material';

export default function StatusChip({ word }: { word: string }) {
  const [status, setStatus] = useState<string | undefined>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleEvent = (e: CustomEvent) => {
      const data = e.detail;
      if (data.word && data.word.toLowerCase() === word.toLowerCase()) {
        if (data.type === 'dictionary_add_processing') {
          setStatus('processing');
        } else if (data.type === 'dictionary_add_definitions_received') {
          setStatus('definitions_received');
        } else if (data.type === 'dictionary_add_duplicate') {
          setStatus('duplicate');
        }
      }
    };

    window.addEventListener('mercure-word-status', handleEvent as EventListener);
    return () => {
      window.removeEventListener('mercure-word-status', handleEvent as EventListener);
    };
  }, [word]);

  useEffect(() => {
    if (!status) return;
    setVisible(true);
    const timeoutId = setTimeout(() => {
      setVisible(false);
      setStatus(undefined); // Optional: clear status after hiding
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [status]);

  if (!status || !visible) return null;

  let label = status;
  let icon = undefined;
  let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';

  switch (status) {
    case 'processing':
      label = 'Fetching...';
      icon = <CircularProgress size={14} color="inherit" />;
      color = 'primary';
      break;
    case 'definitions_received':
      label = `Processing definitions...`;
      icon = <CircularProgress size={14} color="inherit" />;
      color = 'info';
      break;
    case 'duplicate':
      label = 'Duplicate';
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
