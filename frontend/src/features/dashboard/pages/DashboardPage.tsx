import { Box, Button, Card, CardContent, Chip, Divider, Typography, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import useStore from '../../../store/useStore';

export default function Dashboard() {
  const profile = useStore((state) => state.profile);
  const dictionary = useStore((state) => state.dictionary);
  const navigate = useNavigate();

  const totalWords = dictionary.length;
  const totalDefinitions = dictionary.reduce((sum, word) => sum + word.definitions.length, 0);
  const recentWords = dictionary.slice(-5).reverse();

  return (
    <Box className="animate-fade-in">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(270px, 0.75fr)' },
          gap: 2.5,
          alignItems: 'stretch',
          mb: 5,
        }}
      >
        <Box sx={{ pt: { xs: 0, lg: 1 } }}>
          <Typography variant="overline" color="secondary.main">
            Your learning space
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: '2.45rem', sm: '3.35rem' }, mt: 0.7, maxWidth: 680 }}>
            Welcome{profile && <>, {profile.username}</>}. Let&apos;s make words stick.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mt: 1.6, mb: 3 }}>
            Build a deck you recognise at a glance, then practise from a focused card—one definition at a time.
          </Typography>

          <Card
            sx={{
              maxWidth: 640,
              color: '#FFFFFF',
              backgroundColor: '#172033',
              border: 'none',
              boxShadow: '0 18px 38px rgba(23, 32, 51, 0.16)',
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, sm: 3.25 }, '&:last-child': { pb: { xs: 2.5, sm: 3.25 } } }}>
              <Typography variant="overline" sx={{ color: '#E8A17F' }}>
                Ready when you are
              </Typography>
              <Typography variant="h4" sx={{ color: '#FFFFFF', mt: 0.4, mb: 0.8 }}>
                Recall, don&apos;t just reread.
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.7), maxWidth: 430, mb: 2.5 }}>
                {totalWords === 0
                  ? 'Add words to your dictionary to unlock quiz practice.'
                  : 'Open a round based on the words you have already saved.'}
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => navigate('/quiz')}
                disabled={totalWords === 0}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                Start a quiz
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Card sx={{ alignSelf: { xs: 'auto', lg: 'end' }, backgroundColor: '#FFFDF9' }}>
          <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 2.5,
                  color: 'primary.main',
                  backgroundColor: alpha('#2453A6', 0.1),
                }}
              >
                <MenuBookRoundedIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1">Your deck</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="h3" sx={{ fontSize: '2.2rem', color: 'primary.dark' }}>
                  {totalWords}
                </Typography>
                <Typography variant="body2" color="text.secondary">words saved</Typography>
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontSize: '2.2rem', color: 'primary.dark' }}>
                  {totalDefinitions}
                </Typography>
                <Typography variant="body2" color="text.secondary">definitions</Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2.5 }} />
            <Button
              variant="text"
              color="primary"
              onClick={() => navigate('/dictionary')}
              startIcon={<TranslateRoundedIcon />}
              sx={{ px: 0.25 }}
            >
              Manage vocabulary
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 1.75 }}>
        <Box>
          <Typography variant="h5">Fresh in your deck</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            The last words you added, ready for the next recall round.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/dictionary')}
          startIcon={<MenuBookRoundedIcon />}
          sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
        >
          Dictionary
        </Button>
      </Box>

      <Card sx={{ backgroundColor: '#FFFFFF' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          {recentWords.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {recentWords.map((word) => (
                <Chip
                  key={word.id}
                  label={word.text}
                  variant="outlined"
                  sx={{
                    px: 0.5,
                    py: 0.3,
                    borderColor: '#D4D8E0',
                    color: 'text.primary',
                    backgroundColor: '#FBFCFE',
                    '&:hover': { borderColor: 'primary.main', backgroundColor: alpha('#2453A6', 0.04) },
                  }}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
              <SchoolRoundedIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="body2" color="text.secondary">
                Your first saved word will appear here.
              </Typography>
              <Button size="small" onClick={() => navigate('/dictionary')}>Add words</Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
