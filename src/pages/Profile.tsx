import React, { useEffect, useRef, useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button } from '@mui/material';
import '../styles/profile.css';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { auth, db, storage } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const Profile: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'jobseeker' | 'employer' | ''>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');
  const [companyPostcode, setCompanyPostcode] = useState('');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [cvBusy, setCvBusy] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          if (typeof data?.companyName === 'string') {
            setCompanyName(data.companyName);
          }
          if (typeof data?.companyLocation === 'string') {
            setCompanyLocation(data.companyLocation);
          }
          if (typeof data?.companyPostcode === 'string') {
            setCompanyPostcode(data.companyPostcode);
          }
          if (typeof data?.applicationEmail === 'string') {
            setApplicationEmail(data.applicationEmail);
          }
          if (typeof data?.instagramUrl === 'string') {
            setInstagramUrl(data.instagramUrl);
          }
          if (typeof data?.cvUrl === 'string') {
            setCvUrl(data.cvUrl);
          }
          if (typeof data?.cvFileName === 'string') {
            setCvFileName(data.cvFileName);
          }
          if (typeof data?.cvStoragePath === 'string') {
            setCvPath(data.cvStoragePath);
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
        companyName: companyName || null,
        companyLocation: companyLocation || null,
        companyPostcode: companyPostcode || null,
        applicationEmail: applicationEmail || null,
        instagramUrl: instagramUrl || null,
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

  const handleCvFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!currentUser) return;
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('CV file is too large (max 5MB).', { variant: 'error' });
      return;
    }
    try {
      setCvBusy(true);
      if (cvPath) {
        try {
          await deleteObject(storageRef(storage, cvPath));
        } catch (e) {}
      }
      const path = `user-cvs/${currentUser.uid}/${Date.now()}-${file.name}`;
      const ref = storageRef(storage, path);
      const snap = await uploadBytes(ref, file);
      const url = await getDownloadURL(snap.ref);
      const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
      await setDoc(profileRef, {
        cvUrl: url,
        cvFileName: file.name,
        cvStoragePath: path,
        cvUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      setCvUrl(url);
      setCvFileName(file.name);
      setCvPath(path);
      enqueueSnackbar('CV uploaded.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar('Failed to upload CV.', { variant: 'error' });
    } finally {
      setCvBusy(false);
    }
  };

  const handleDeleteCv = async () => {
    if (!currentUser || !cvPath) return;
    try {
      setCvBusy(true);
      try {
        await deleteObject(storageRef(storage, cvPath));
      } catch (e) {}
      const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
      await setDoc(profileRef, {
        cvUrl: null,
        cvFileName: null,
        cvStoragePath: null,
        cvUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      setCvUrl(null);
      setCvFileName(null);
      setCvPath(null);
      enqueueSnackbar('CV deleted.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar('Failed to delete CV.', { variant: 'error' });
    } finally {
      setCvBusy(false);
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
          {role === 'employer' && (
            <Box mt={2} className="profile__employerDetails">
              <Typography variant="subtitle1">Employer details (optional)</Typography>
              <Box mt={2}>
                <TextField
                  label="Company name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Location"
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  disabled={loading}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Postcode"
                  value={companyPostcode}
                  onChange={(e) => setCompanyPostcode(e.target.value)}
                  disabled={loading}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Application email"
                  type="email"
                  value={applicationEmail}
                  onChange={(e) => setApplicationEmail(e.target.value)}
                  disabled={loading}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Instagram profile link"
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  disabled={loading}
                  fullWidth
                  margin="normal"
                />
              </Box>
            </Box>
          )}
          {false && role === 'jobseeker' && (
            <Box className="profile__cv">
              <Typography variant="subtitle1">CV</Typography>
              {cvUrl ? (
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  <Button
                    variant="outlined"
                    href={cvUrl as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    disabled={cvBusy}
                  >
                    {cvFileName || 'View CV'}
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={cvBusy}
                  >
                    {cvBusy ? 'Uploading…' : 'Replace CV'}
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    onClick={handleDeleteCv}
                    disabled={cvBusy}
                  >
                    Delete
                  </Button>
                </Box>
              ) : (
                <Box mt={1} display="flex" alignItems="center" gap={2}>
                  <Typography variant="body2">No CV uploaded.</Typography>
                  <Button
                    variant="contained"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={cvBusy}
                  >
                    {cvBusy ? 'Uploading…' : 'Upload CV'}
                  </Button>
                </Box>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
                onChange={handleCvFileChange}
              />
            </Box>
          )}
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
