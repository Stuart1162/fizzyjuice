import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button } from '@mui/material';
import '../styles/profile.css';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Profile: React.FC = () => {
  const { currentUser, isSuperAdmin, signOut } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'jobseeker' | 'employer' | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        setDisplayName(currentUser.displayName || '');
        setEmail(currentUser.email || '');
        // load role from profile doc
        const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.role === 'jobseeker' || data?.role === 'employer') {
            setRole(data.role);
          }
        }
      } catch (e) {
        enqueueSnackbar('Failed to load profile', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, enqueueSnackbar]);

  const handleSave = async () => {
    if (!currentUser) return;
    try {
      setSaving(true);
      // Update Firebase Auth displayName
      await updateProfile(auth.currentUser!, { displayName: displayName || undefined });
      // Persist to Firestore profile doc
      const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
      await setDoc(profileRef, {
        displayName,
        email: currentUser.email,
        role: role || undefined,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      enqueueSnackbar('Profile updated', { variant: 'success' });
    } catch (e: any) {
      console.error(e);
      enqueueSnackbar('Failed to update profile', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }} className="profile">
      <Paper variant="outlined" sx={{ p: 3 }} className="profile__card">
        <Typography variant="h5" gutterBottom className="profile__title">Profile</Typography>
        <Box className="profile__form">
          <TextField
            label="Full name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            fullWidth
            className="profile__nameInput"
          />
          <TextField
            label="Email"
            value={email}
            disabled
            helperText="Email changes not supported in this view"
            fullWidth
            className="profile__emailInput"
          />
          <Box className="profile__actions">
            <Button variant="outlined" color="inherit" onClick={signOut} className="profile__logoutBtn">
              Logout
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || loading} className="profile__saveBtn">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;
