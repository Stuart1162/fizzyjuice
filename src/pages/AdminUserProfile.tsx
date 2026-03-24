import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Snackbar,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AdminUserProfileData {
  displayName?: string | null;
  email?: string | null;
  role?: 'jobseeker' | 'employer' | 'admin' | null;
  [key: string]: any;
}

const AdminUserProfile: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { currentUser, isSuperAdmin } = useAuth();
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [profile, setProfile] = useState<AdminUserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [companyPostcode, setCompanyPostcode] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [about, setAbout] = useState('');
  const [culture, setCulture] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [employerTelephone, setEmployerTelephone] = useState('');
  const [livingWageEmployer, setLivingWageEmployer] = useState<boolean | null>(null);

  // Determine if current user is an admin (from their profile prefs)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentUser) {
        if (!cancelled) setIsAdminRole(false);
        return;
      }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const data = snap.exists() ? (snap.data() as any) : undefined;
        if (!cancelled) setIsAdminRole(data?.role === 'admin');
      } catch {
        if (!cancelled) setIsAdminRole(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Load target user's profile
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!uid) {
        if (!cancelled) {
          setError('No user id provided.');
          setLoading(false);
        }
        return;
      }
      if (!(currentUser && (isSuperAdmin || isAdminRole))) {
        if (!cancelled) {
          setError('You do not have permission to view this profile.');
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const profileRef = doc(db, 'users', uid, 'prefs', 'profile');
        const snap = await getDoc(profileRef);
        if (!snap.exists()) {
          if (!cancelled) {
            setError('Profile not found for this user.');
            setProfile(null);
          }
        } else if (!cancelled) {
          setProfile(snap.data() as AdminUserProfileData);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load user profile.');
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [uid, currentUser, isSuperAdmin, isAdminRole]);

  useEffect(() => {
    if (!profile) return;
    setCompanyName((profile as any).companyName || '');
    setCompanyLocation((profile as any).companyLocation || '');
    setCompanyPostcode((profile as any).companyPostcode || '');
    setShortDescription((profile as any).employerShortDescription || '');
    setAbout((profile as any).employerAbout || '');
    setCulture((profile as any).employerCulture || '');
    setWebsiteUrl((profile as any).websiteUrl || '');
    setApplicationEmail((profile as any).applicationEmail || '');
    setInstagramUrl((profile as any).instagramUrl || '');
    setAddressLine1((profile as any).addressLine1 || '');
    setAddressLine2((profile as any).addressLine2 || '');
    setEmployerTelephone((profile as any).employerTelephone || '');
    const lw = (profile as any).livingWageEmployer;
    setLivingWageEmployer(typeof lw === 'boolean' ? lw : null);
  }, [profile]);

  const handleCloseSnackbar = () => {
    setSnackbar(null);
  };

  const handleSaveEmployer = async () => {
    if (!uid || !profile || profile.role !== 'employer') return;
    try {
      setSaving(true);
      const profileRef = doc(db, 'users', uid, 'prefs', 'profile');
      await setDoc(
        profileRef,
        {
          companyName: companyName || null,
          companyLocation: companyLocation || null,
          companyPostcode: companyPostcode || null,
          employerShortDescription: shortDescription || null,
          employerAbout: about || null,
          employerCulture: culture || null,
          websiteUrl: websiteUrl || null,
          applicationEmail: applicationEmail || null,
          instagramUrl: instagramUrl || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          employerTelephone: employerTelephone || null,
          livingWageEmployer: livingWageEmployer,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const slug = (profile as any).publicEmployerSlug as string | undefined;
      if (slug) {
        const publicRef = doc(db, 'employerProfiles', slug);
        await setDoc(
          publicRef,
          {
            companyName: companyName || (profile as any).displayName || (profile as any).email || null,
            location: companyLocation || null,
            postcode: companyPostcode || null,
            shortDescription: shortDescription || null,
            about: about || null,
            culture: culture || null,
            addressLine1: addressLine1 || null,
            addressLine2: addressLine2 || null,
            telephone: employerTelephone || null,
            email: applicationEmail || null,
            website: websiteUrl || null,
            instagram: instagramUrl || null,
            livingWageEmployer: livingWageEmployer,
            ownerUid: uid,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              companyName,
              companyLocation,
              companyPostcode,
              employerShortDescription: shortDescription,
              employerAbout: about,
              employerCulture: culture,
              websiteUrl,
              applicationEmail,
              instagramUrl,
              addressLine1,
              addressLine2,
              employerTelephone,
              livingWageEmployer,
            }
          : prev
      );
      setSnackbar({ message: 'Employer profile updated.', severity: 'success' });
    } catch (e: any) {
      setSnackbar({ message: e?.message || 'Failed to update employer profile.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateEmployerSlug = async () => {
    if (!uid || !profile || profile.role !== 'employer') return;

    const baseForSlug = (companyName || (profile as any).companyName || (profile as any).displayName || (profile as any).email || '').trim();
    if (!baseForSlug) {
      setSnackbar({ message: 'Please enter a company name first.', severity: 'error' });
      return;
    }

    const newSlug = baseForSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!newSlug) {
      setSnackbar({ message: 'Could not generate a valid URL from the company name.', severity: 'error' });
      return;
    }

    const currentSlug = (profile as any).publicEmployerSlug as string | undefined;
    if (currentSlug === newSlug) {
      setSnackbar({ message: 'Company URL is already using this name.', severity: 'success' });
      return;
    }

    try {
      setSaving(true);

      const profileRef = doc(db, 'users', uid, 'prefs', 'profile');
      await setDoc(
        profileRef,
        {
          companyName: companyName || null,
          publicEmployerSlug: newSlug,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const publicRef = doc(db, 'employerProfiles', newSlug);
      await setDoc(
        publicRef,
        {
          companyName: companyName || (profile as any).displayName || (profile as any).email || null,
          location: companyLocation || null,
          postcode: companyPostcode || null,
          shortDescription: shortDescription || null,
          about: about || null,
          culture: culture || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          telephone: employerTelephone || null,
          email: applicationEmail || (profile as any).email || null,
          website: websiteUrl || null,
          instagram: instagramUrl || null,
          livingWageEmployer: livingWageEmployer,
          ownerUid: uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              companyName,
              companyLocation,
              companyPostcode,
              publicEmployerSlug: newSlug,
            }
          : prev
      );

      setSnackbar({ message: 'Company URL updated to use the business name.', severity: 'success' });
    } catch (e: any) {
      setSnackbar({ message: e?.message || 'Failed to update company URL.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">You must be signed in to view this page.</Alert>
      </Container>
    );
  }

  if (!(isSuperAdmin || isAdminRole)) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!profile) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">No profile data found for this user.</Alert>
      </Container>
    );
  }

  const displayName = profile.displayName || '—';
  const email = profile.email || '—';
  const role = profile.role || '—';

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          User profile
        </Typography>
        <Box mb={2}>
          <Typography variant="subtitle1">Name</Typography>
          <Typography variant="body1">{displayName}</Typography>
        </Box>
        <Box mb={2}>
          <Typography variant="subtitle1">Email</Typography>
          <Typography variant="body1">{email}</Typography>
        </Box>
        <Box mb={3}>
          <Typography variant="subtitle1">Role</Typography>
          <Typography variant="body1">{role}</Typography>
        </Box>
        {profile.role === 'employer' && (
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Employer profile details
            </Typography>
            <Box mb={2}>
              <TextField
                label="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Location"
                value={companyLocation}
                onChange={(e) => setCompanyLocation(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Postcode"
                value={companyPostcode}
                onChange={(e) => setCompanyPostcode(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Short description"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                fullWidth
                margin="normal"
                inputProps={{ maxLength: 50 }}
                helperText="Max 50 characters"
              />
              <TextField
                label="About"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              <TextField
                label="Culture"
                value={culture}
                onChange={(e) => setCulture(e.target.value)}
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              <TextField
                label="Website link"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Application email"
                value={applicationEmail}
                onChange={(e) => setApplicationEmail(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Instagram profile link"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Address line 1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Address line 2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Telephone number"
                value={employerTelephone}
                onChange={(e) => setEmployerTelephone(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Living Wage Employer (yes/no)"
                value={
                  livingWageEmployer === true
                    ? 'yes'
                    : livingWageEmployer === false
                    ? 'no'
                    : ''
                }
                onChange={(e) => {
                  const v = e.target.value.trim().toLowerCase();
                  if (v === 'yes') setLivingWageEmployer(true);
                  else if (v === 'no') setLivingWageEmployer(false);
                  else setLivingWageEmployer(null);
                }}
                fullWidth
                margin="normal"
                helperText="Enter 'yes' or 'no' to override, or leave blank to unset"
              />
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="body2" color="textSecondary">
                Current company URL slug: {(profile as any).publicEmployerSlug || 'not set'}
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleRegenerateEmployerSlug}
                  disabled={saving}
                >
                  Update company URL from name
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveEmployer}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save employer profile'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Raw profile data
          </Typography>
          <Box
            component="pre"
            sx={{
              backgroundColor: '#f5f5f5',
              p: 2,
              borderRadius: 1,
              fontSize: 12,
              overflowX: 'auto',
            }}
          >
            {JSON.stringify(profile, null, 2)}
          </Box>
        </Box>
        {snackbar && (
          <Snackbar
            open
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        )}
      </Paper>
    </Container>
  );
};

export default AdminUserProfile;
