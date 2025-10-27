import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import '../styles/register.css';
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
  InputAdornment,
  IconButton,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    businessName: '',
    role: 'jobseeker' as 'jobseeker' | 'employer',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    if (formData.password.length < 6) {
      return setError('Password should be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);
      const cred = await signUp(formData.email, formData.password, formData.displayName);
      // Persist role to profile
      if (cred.user?.uid) {
        await setDoc(doc(db, 'users', cred.user.uid, 'prefs', 'profile'), {
          role: formData.role,
          displayName: formData.displayName,
          email: formData.email,
          businessName: formData.businessName || null,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
      enqueueSnackbar('Account created successfully!', { variant: 'success' });
      // Redirect: jobseeker -> onboarding, employer -> dashboard
      if (formData.role === 'jobseeker') {
        navigate('/dashboard?onboard=1');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Failed to create an account. ' + (err.message || 'Please try again.'));
      enqueueSnackbar('Registration failed. ' + (err.message || 'Please try again.'), { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register">
      <Container maxWidth="sm">
        <Paper className="register__card">
          <Typography variant="h4" component="h1" className="register__title" gutterBottom>
            Create an Account
          </Typography>
          
          <Typography variant="body1" className="register__subtitle" paragraph>
            Join us to start posting and applying for jobs
          </Typography>

        {error && (
          <Alert severity="error" className="register__error">
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} className="register__form">
          <div className="register__roleGroup">
            <FormLabel id="role-label" className="register__roleLabel">I want to</FormLabel>
            <RadioGroup
              aria-labelledby="role-label"
              row
              name="role"
              value={formData.role}
              onChange={handleChange as any}
              className="register__radioGroup"
            >
              <FormControlLabel value="jobseeker" control={<Radio />} label="get hired" />
              <FormControlLabel value="employer" control={<Radio />} label="post a job" />
            </RadioGroup>
          </div>
          <div className="register__formField">
            <TextField
              fullWidth
              id="displayName"
              label="Full Name"
              name="displayName"
              autoComplete="name"
              autoFocus
              value={formData.displayName}
              onChange={handleChange}
              required
            />
          </div>
          
          {formData.role === 'employer' && (
            <div className="register__formField">
              <TextField
                fullWidth
                id="businessName"
                label="Business Name"
                name="businessName"
                autoComplete="organization"
                value={formData.businessName}
                onChange={handleChange}
              />
            </div>
          )}
          
          <div className="register__formField">
            <TextField
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="register__formField">
            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>
          
          <div className="register__formField">
            <TextField
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              error={formData.password !== formData.confirmPassword && formData.confirmPassword !== ''}
              helperText={
                formData.password !== formData.confirmPassword && formData.confirmPassword !== ''
                  ? 'Passwords do not match'
                  : ''
              }
            />
          </div>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            className="register__submitButton"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>

          <Divider className="register__divider">OR</Divider>

          <div className="register__loginLink">
            <Typography variant="body2" component="span">
              Already have an account?{' '}
              <Link
                component={RouterLink}
                to="/login"
                className="register__loginLink"
              >
                Sign in
              </Link>
            </Typography>
          </div>
        </Box>
      </Paper>
    </Container>
  </div>
  );
};

export default Register;
