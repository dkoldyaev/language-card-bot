import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Alert } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import apiClient from '../api/client';
import useStore from '../store/useStore';

interface AuthProps {
  mode?: 'login' | 'register';
}

export default function Auth({ mode = 'login' }: AuthProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const navigate = useNavigate();
  
  const setToken = useStore((state) => state.setToken);
  const setProfile = useStore((state) => state.setProfile);

  const isLogin = mode === 'login';

  useEffect(() => {
    setRegistrationSuccess(false);
    setError(null);
  }, [mode]);

  const handleSubmit = async () => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setError(null);
    setLoading(true);

    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    try {
      const response = await apiClient.post(endpoint, { username });
      
      if (isLogin) {
        const { token, user } = response.data;
        setToken(token);
        setProfile(user);
        navigate('/');
      } else {
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
