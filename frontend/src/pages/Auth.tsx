import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import apiClient from '../api/client';
import useStore from '../store/useStore';

interface AuthProps {
  mode?: 'login' | 'register';
}

export default function Auth({ mode = 'login' }: AuthProps) {
  const [username, setUsername] = useState('');
  const [baseLanguage, setBaseLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [desiredLevel, setDesiredLevel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();
  
  const setToken = useStore((state) => state.setToken);
  const setMercureToken = useStore((state) => state.setMercureToken);
  const setProfile = useStore((state) => state.setProfile);

  const isLogin = mode === 'login';

  useEffect(() => {
    setRegistrationSuccess(false);
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!isLogin && (!baseLanguage || !targetLanguage || !desiredLevel)) {
      setError('Please select all language settings');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const response = await apiClient.post('/auth/login', { username });
        const { token, mercureToken, user } = response.data;
        setToken(token);
        if (mercureToken) setMercureToken(mercureToken);
        setProfile(user);
        navigate('/');
      } else {
        const response = await apiClient.post('/auth/register', { username });
        const { token } = response.data;
        
        await apiClient.post('/settings', { 
          baseLanguage, 
          targetLanguage, 
          desiredLevel 
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setRegistrationSuccess(true);
      }
    } catch (err: any) {
      console.error('Auth error', err.response?.data);
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Card sx={{ minWidth: 350 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom align="center">
            {isLogin ? 'Log in' : 'Create account'}
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {registrationSuccess ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                Registration successful
              </Alert>
              <Button 
                component={RouterLink} 
                to="/login"
                variant="contained"
                sx={{ mt: 2 }}
              >
                Back to login
              </Button>
            </Box>
          ) : (
            <>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                margin="normal"
              />
              
              {!isLogin && (
                <>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="base-language-label">Native Language</InputLabel>
                    <Select
                      labelId="base-language-label"
                      value={baseLanguage}
                      label="Native Language"
                      onChange={(e) => setBaseLanguage(e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="ru">Russian</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel id="target-language-label">Learning Language</InputLabel>
                    <Select
                      labelId="target-language-label"
                      value={targetLanguage}
                      label="Learning Language"
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="es">Spanish</MenuItem>
                      <MenuItem value="ru">Russian</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <InputLabel id="level-label">Level</InputLabel>
                    <Select
                      labelId="level-label"
                      value={desiredLevel}
                      label="Level"
                      onChange={(e) => setDesiredLevel(e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="A0">A0</MenuItem>
                      <MenuItem value="A1">A1</MenuItem>
                      <MenuItem value="A2">A2</MenuItem>
                      <MenuItem value="B1">B1</MenuItem>
                      <MenuItem value="B2">B2</MenuItem>
                      <MenuItem value="C1">C1</MenuItem>
                      <MenuItem value="C2">C2</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {isLogin ? 'Log in' : 'Create account'}
                </Button>
                
                <Box sx={{ textAlign: 'center' }}>
                  {isLogin ? (
                    <Button 
                      component={RouterLink} 
                      to="/register"
                      variant="text"
                    >
                      Sign up
                    </Button>
                  ) : (
                    <Button 
                      component={RouterLink} 
                      to="/login"
                      variant="text"
                    >
                      Log in instead
                    </Button>
                  )}
                </Box>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
