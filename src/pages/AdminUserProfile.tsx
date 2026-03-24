import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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
      </Paper>
    </Container>
  );
};

export default AdminUserProfile;
