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
import { doc, setDoc, getDoc } from 'firebase/firestore';

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

    if (formData.role === 'employer' && !formData.businessName.trim()) {
      return setError('Please enter your business name');
    }

    try {
      setError('');
      setLoading(true);
      const cred = await signUp(formData.email, formData.password, formData.displayName);
      // Prepare a stable slug for the employer's public company profile (if applicable)
      let publicEmployerSlug: string | null = null;
      if (formData.role === 'employer') {
        const baseForSlug = (formData.businessName || formData.displayName || formData.email).trim();
        if (baseForSlug) {
          publicEmployerSlug =
            baseForSlug
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || null;
        }
      }

      // Persist role (and initial employer details) to profile and company profile
      if (cred.user?.uid) {
        const uid = cred.user.uid;
        const profileRef = doc(db, 'users', uid, 'prefs', 'profile');
        const nowIso = new Date().toISOString();

        // For employers, attempt to reuse or claim an existing company profile by slug.
        // Any Firestore permission issues here should not block account creation.
        let finalEmployerSlug = publicEmployerSlug;
        if (formData.role === 'employer' && publicEmployerSlug) {
          try {
            const baseRef = doc(db, 'employerProfiles', publicEmployerSlug);
            const existingSnap = await getDoc(baseRef);

            if (existingSnap.exists()) {
              const existing = existingSnap.data() as any;
              const existingOwnerUid = existing?.ownerUid as string | null | undefined;

              if (!existingOwnerUid) {
                // Admin-created, unclaimed profile – claim it for this employer without overwriting content
                await setDoc(
                  baseRef,
                  {
                    ownerUid: uid,
                    email: formData.email,
                    updatedAt: nowIso,
                  },
                  { merge: true }
                );
              } else if (existingOwnerUid === uid) {
                // Existing profile already owned by this user – just make sure contact details are up to date
                await setDoc(
                  baseRef,
                  {
                    email: formData.email,
                    updatedAt: nowIso,
                  },
                  { merge: true }
                );
              } else {
                // Slug is already owned by another account – generate a unique slug for this new employer
                let uniqueSlug = publicEmployerSlug;
                let suffix = 2;
                while (suffix < 20) {
                  const candidate = `${publicEmployerSlug}-${suffix}`;
                  const candidateRef = doc(db, 'employerProfiles', candidate);
                  const candidateSnap = await getDoc(candidateRef);
                  if (!candidateSnap.exists()) {
                    uniqueSlug = candidate;
                    break;
                  }
                  suffix++;
                }
                if (uniqueSlug === publicEmployerSlug) {
                  uniqueSlug = `${publicEmployerSlug}-${uid.slice(0, 6)}`;
                }

                finalEmployerSlug = uniqueSlug;
                const newRef = doc(db, 'employerProfiles', finalEmployerSlug);
                await setDoc(
                  newRef,
                  {
                    companyName: formData.businessName || formData.displayName || formData.email || null,
                    location: null,
                    postcode: null,
                    shortDescription: null,
                    about: null,
                    culture: null,
                    benefits: [],
                    businessTypes: [],
                    livingWageEmployer: null,
                    addressLine1: null,
                    addressLine2: null,
                    telephone: null,
                    email: formData.email,
                    website: null,
                    instagram: null,
                    ownerUid: uid,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                  },
                  { merge: true }
                );
              }
            } else {
              // No existing profile with this slug – create a fresh one
              await setDoc(
                baseRef,
                {
                  companyName: formData.businessName || formData.displayName || formData.email || null,
                  location: null,
                  postcode: null,
                  shortDescription: null,
                  about: null,
                  culture: null,
                  benefits: [],
                  businessTypes: [],
                  livingWageEmployer: null,
                  addressLine1: null,
                  addressLine2: null,
                  telephone: null,
                  email: formData.email,
                  website: null,
                  instagram: null,
                  ownerUid: uid,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                },
                { merge: true }
              );
            }
          } catch (e) {
            // Swallow Firestore permission/validation errors here so signup can still succeed
            console.error('Employer profile setup failed during registration:', e);
            finalEmployerSlug = null;
          }
        }

        const profilePayload: any = {
          role: formData.role,
          displayName: formData.displayName,
          email: formData.email,
          // Keep both names for backward-compat, but use companyName going forward
          companyName: formData.businessName || null,
          businessName: formData.businessName || null,
          createdAt: nowIso,
        };
        if (formData.role === 'employer' && finalEmployerSlug) {
          profilePayload.publicEmployerSlug = finalEmployerSlug;
        }
        await setDoc(profileRef, profilePayload, { merge: true });
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
                label="Business Name *"
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
