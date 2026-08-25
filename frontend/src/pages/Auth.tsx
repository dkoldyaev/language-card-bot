import { useState } from 'react';
import { Box, Typography, TextField, Button, Card, CardContent, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import useStore from '../store/useStore';

export default function Auth() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const setToken = useStore((state) => state.setToken);
  const setProfile = useStore((state) => state.setProfile);

  const handleAuth = async (endpoint: '/auth/login' | '/auth/register') => {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post(endpoint, { username });
      const { token, user } = response.data;
      setToken(token);
      setProfile(user);
      navigate('/');
    } catch (err: any) {
      console.error(err);
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
            English Card Bot
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <TextField
            fullWidth
            label="Username"
            variant="outlined"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            margin="normal"
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button 
              fullWidth 
              variant="contained" 
              onClick={() => handleAuth('/auth/login')}
              disabled={loading}
            >
              Login
            </Button>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => handleAuth('/auth/register')}
              disabled={loading}
            >
              Register
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
