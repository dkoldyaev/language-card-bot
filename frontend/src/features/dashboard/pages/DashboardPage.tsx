import { Box, Typography, Card, CardContent, Button, alpha, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import LibraryBooksRoundedIcon from '@mui/icons-material/LibraryBooksRounded';
import useStore from '../../../store/useStore';

export default function Dashboard() {
  const profile = useStore((state) => state.profile);
  const dictionary = useStore((state) => state.dictionary);
  const navigate = useNavigate();

  const totalWords = dictionary.length;
  const totalDefinitions = dictionary.reduce((sum, w) => sum + w.definitions.length, 0);
  const recentWords = dictionary.slice(-5).reverse();

  const stats = [
    {
      label: 'Words',
      value: totalWords,
      icon: <MenuBookRoundedIcon />,
      color: '#7C3AED',
      bg: alpha('#7C3AED', 0.1),
    },
    {
      label: 'Definitions',
      value: totalDefinitions,
      icon: <LibraryBooksRoundedIcon />,
      color: '#06B6D4',
      bg: alpha('#06B6D4', 0.1),
    },
    {
      label: 'Progress',
      value: totalWords > 0 ? 'Active' : 'Start!',
      icon: <TrendingUpRoundedIcon />,
      color: '#10B981',
      bg: alpha('#10B981', 0.1),
    },
  ];

  return (
    <Box className="animate-fade-in">
      {/* Hero greeting */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(135deg, #F3F4F6 0%, #A78BFA 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Welcome{profile ? `, ${profile.username}` : ''}! 👋
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Ready to expand your vocabulary today?
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box
        className="stagger-children"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        {stats.map((stat) => (
          <Card
            key={stat.label}
            sx={{
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 40px ${alpha(stat.color, 0.15)}`,
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 700, color: stat.color, mt: 0.5 }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    backgroundColor: stat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                  }}
                >
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Quick Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SchoolRoundedIcon />}
          onClick={() => navigate('/quiz')}
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 auto' },
            py: 1.5,
            background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
            '&:hover': {
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            },
          }}
        >
          Start Quiz
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<MenuBookRoundedIcon />}
          onClick={() => navigate('/dictionary')}
          sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' }, py: 1.5 }}
        >
          Open Dictionary
        </Button>
      </Box>

      {/* Recent Words */}
      {recentWords.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Words
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {recentWords.map((word) => (
                <Chip
                  key={word.id}
                  label={word.text}
                  variant="outlined"
                  sx={{
                    borderColor: alpha('#A78BFA', 0.3),
                    color: 'text.primary',
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: '#A78BFA',
                      backgroundColor: alpha('#7C3AED', 0.08),
                    },
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
