import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import useStore from '../store/useStore';

export default function Layout() {
  const profile = useStore((state) => state.profile);
  const reset = useStore((state) => state.reset);
  const navigate = useNavigate();

  const handleLogout = () => {
    reset();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            English Card Bot {profile && `(${profile.username})`}
          </Typography>
          <Button color="inherit" component={RouterLink} to="/">Home</Button>
          <Button color="inherit" component={RouterLink} to="/settings">Settings</Button>
          <Button color="inherit" component={RouterLink} to="/dictionary/add">Add Words</Button>
          <Button color="inherit" component={RouterLink} to="/dictionary/edit">Edit Dictionary</Button>
          <Button color="inherit" component={RouterLink} to="/quiz">Quiz</Button>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
