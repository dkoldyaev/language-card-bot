import { Box, Button, Card, Typography, alpha } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useNavigate } from 'react-router-dom';

export default function QuizEmptyState() {
  const navigate = useNavigate();

  return (
    <Box
      className="animate-fade-in"
      sx={{
        minHeight: { xs: 'auto', md: '68vh' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 880, overflow: 'hidden' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' } }}>
          <Box
            sx={{
              minHeight: { xs: 220, md: 420 },
              p: { xs: 3, sm: 4.5 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#172033',
              color: '#FFFFFF',
            }}
          >
            <Box
              sx={{
                width: 58,
                height: 58,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 3,
                color: '#172033',
                backgroundColor: '#E8A17F',
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Box sx={{ mt: { xs: 4, md: 0 } }}>
              <Typography variant="overline" sx={{ color: '#E8A17F' }}>
                Quiz is locked
              </Typography>
              <Typography variant="h3" sx={{ color: '#FFFFFF', mt: 0.5, maxWidth: 280 }}>
                Build your deck before testing recall.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: { xs: 3, sm: 4.5 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="overline" color="secondary.main">
              Vocabulary needed
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', sm: '2.55rem' }, mt: 0.5, mb: 1.25 }}>
              Your dictionary is empty
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, mb: 3 }}>
              Quiz mode trains your memory by asking for words from your saved dictionary. Add words to unlock active recall practice.
            </Typography>
            <Box sx={{ display: 'grid', gap: 1.25, mb: 3.25 }}>
              {[
                'Add words with meanings in Dictionary',
                'Unlock personalized recall quizzes',
                'Track progress as your deck grows',
              ].map((item) => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      color: 'primary.main',
                      backgroundColor: alpha('#2453A6', 0.12),
                    }}
                  >
                    <CheckRoundedIcon sx={{ fontSize: 15 }} />
                  </Box>
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))}
            </Box>
            <Box>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate('/dictionary')}
                startIcon={<MenuBookRoundedIcon />}
                endIcon={<ArrowForwardRoundedIcon />}
              >
                Go to Dictionary
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
