import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  Divider,
  Alert,
} from '@mui/material';
import '../styles/login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  // Get the previous location or default to home
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      enqueueSnackbar('Successfully logged in!', { variant: 'success' });
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Failed to sign in. ' + (err.message || 'Please check your credentials.'));
      enqueueSnackbar('Login failed. Please check your credentials.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }} className="login">
      <Paper elevation={3} sx={{ p: 4 }} className="login__card">
        <Typography variant="h4" component="h1" align="center" gutterBottom className="login__title">
          Sign In
        </Typography>

        <Typography variant="body1" color="textSecondary" align="center" paragraph className="login__subtitle">
          Sign in to post jobs and manage your listings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} className="login__error">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }} className="login__form">
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login__emailInput"
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login__passwordInput"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            className="login__submitButton"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2, mb: 2 }} className="login__forgot">
            <Link
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              underline="hover"
              className="login__forgotLink"
            >
              Forgot password?
            </Link>
          </Box>

          <Divider sx={{ my: 3 }} className="login__divider">OR</Divider>

          <Box sx={{ textAlign: 'center', mt: 3 }} className="login__register">
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                component={RouterLink}
                to="/register"
                variant="body2"
                underline="hover"
                className="login__registerLink"
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
