import { useState, useEffect } from 'react';
import { Chip, CircularProgress } from '@mui/material';

export default function StatusChip({ status, definitionsCount }: { status?: string, definitionsCount?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timeoutId = setTimeout(() => {
      setVisible(false);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [status, definitionsCount]);

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
      label = `Processing (${definitionsCount})`;
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
