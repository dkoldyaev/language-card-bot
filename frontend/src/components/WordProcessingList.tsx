import { Box, Typography, List, ListItem, ListItemText, CircularProgress, Chip } from '@mui/material';
import useStore from '../store/useStore';

export default function WordProcessingList() {
  const wordProcessing = useStore((state) => state.wordProcessing);

  if (wordProcessing.length === 0) return null;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>Processing Status</Typography>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {wordProcessing.map((item, index) => {
          let secondaryText = '';
          let icon = null;
          let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';

          switch (item.status) {
            case 'processing':
              secondaryText = 'Fetching definitions...';
              icon = <CircularProgress size={16} />;
              color = 'primary';
              break;
            case 'definitions_received':
              secondaryText = `Received ${item.definitionsCount} definitions, processing...`;
              icon = <CircularProgress size={16} />;
              color = 'info';
              break;
            case 'processed':
              secondaryText = `Processed ${item.processedCount} of ${item.totalDefinitions} definitions.`;
              if (item.processedCount === item.totalDefinitions) {
                color = 'success';
              } else {
                icon = <CircularProgress size={16} />;
                color = 'info';
              }
              break;
            case 'duplicate':
              secondaryText = `Word already exists (${item.definitionsCount} definitions).`;
              color = 'warning';
              break;
          }

          return (
            <ListItem key={index} divider>
              <ListItemText 
                primary={item.word} 
                secondary={secondaryText} 
              />
              <Chip label={item.status} color={color} size="small" icon={icon} />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
