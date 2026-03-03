import React, { useEffect, useRef, useState } from 'react';
import { Container, Paper, Typography, Box, TextField, Button, FormControlLabel, Checkbox } from '@mui/material';
import '../styles/profile.css';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { supabase } from '../supabaseClient';

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
  // Jobseeker-specific profile fields
  const [preferredJobTitle, setPreferredJobTitle] = useState('');
  const [jobLocationCity, setJobLocationCity] = useState('');
  const [jobPostcode, setJobPostcode] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [shiftPreference, setShiftPreference] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [certFoodSafety, setCertFoodSafety] = useState(false);
  const [certRSA, setCertRSA] = useState(false);
  const [certFirstAid, setCertFirstAid] = useState(false);
  const [certBarista, setCertBarista] = useState(false);
  const [certHACCP, setCertHACCP] = useState(false);
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
          if (typeof data?.preferredJobTitle === 'string') {
            setPreferredJobTitle(data.preferredJobTitle);
          }
          if (typeof data?.jobLocationCity === 'string') {
            setJobLocationCity(data.jobLocationCity);
          }
          if (typeof data?.jobPostcode === 'string') {
            setJobPostcode(data.jobPostcode);
          }
          if (Array.isArray(data?.availability)) {
            setAvailability((data.availability || []) as string[]);
          } else if (typeof data?.availability === 'string') {
            setAvailability([data.availability]);
          }
          if (Array.isArray(data?.shiftPreference)) {
            setShiftPreference((data.shiftPreference || []) as string[]);
          } else if (typeof data?.shiftPreference === 'string') {
            setShiftPreference([data.shiftPreference]);
          }
          if (typeof data?.yearsExperience === 'string') {
            setYearsExperience(data.yearsExperience);
          }
          if (typeof data?.linkedinUrl === 'string') {
            setLinkedinUrl(data.linkedinUrl);
          }
          if (typeof data?.certFoodSafety === 'boolean') {
            setCertFoodSafety(data.certFoodSafety);
          }
          if (typeof data?.certRSA === 'boolean') {
            setCertRSA(data.certRSA);
          }
          if (typeof data?.certFirstAid === 'boolean') {
            setCertFirstAid(data.certFirstAid);
          }
          if (typeof data?.certBarista === 'boolean') {
            setCertBarista(data.certBarista);
          }
          if (typeof data?.certHACCP === 'boolean') {
            setCertHACCP(data.certHACCP);
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
        preferredJobTitle: preferredJobTitle || null,
        jobLocationCity: jobLocationCity || null,
        jobPostcode: jobPostcode || null,
        availability: availability && availability.length > 0 ? availability : [],
        shiftPreference: shiftPreference && shiftPreference.length > 0 ? shiftPreference : [],
        yearsExperience: yearsExperience || null,
        linkedinUrl: linkedinUrl || null,
        certFoodSafety,
        certRSA,
        certFirstAid,
        certBarista,
        certHACCP,
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

      // Best-effort delete any previously stored CV in Supabase
      if (cvPath) {
        try {
          await supabase.storage.from('user-cvs').remove([cvPath]);
        } catch (e) {
          // ignore cleanup errors
        }
      }

      const path = `${currentUser.uid}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('user-cvs')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from('user-cvs')
        .getPublicUrl(path);

      const url = publicUrlData?.publicUrl || null;

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
      console.error(e);
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
        await supabase.storage.from('user-cvs').remove([cvPath]);
      } catch (e) {
        // ignore cleanup errors
      }
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
              <Typography variant="subtitle1" className="profile__sectionTitle">Employer details (optional)</Typography>
              <Box mt={2} className="profile__employerFields">
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
          {role === 'jobseeker' && (
            <>
              <Box mt={2} className="profile__jobseekerDetails">
                <Typography variant="subtitle1" className="profile__sectionTitle">About you</Typography>
                <Box mt={2} className="profile__jobseekerFields">
                  <TextField
                    label="Preferred job title"
                    value={preferredJobTitle}
                    onChange={(e) => setPreferredJobTitle(e.target.value)}
                    disabled={loading}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Location (City)"
                    value={jobLocationCity}
                    onChange={(e) => setJobLocationCity(e.target.value)}
                    disabled={loading}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="Postcode"
                    value={jobPostcode}
                    onChange={(e) => setJobPostcode(e.target.value)}
                    disabled={loading}
                    fullWidth
                    margin="normal"
                  />
                  <Box mt={2} className="profile__availability">
                    <Typography variant="subtitle2" className="profile__subTitle">Availability</Typography>
                    <Box className="profile__availabilityOptions">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={availability.includes('full-time')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAvailability((prev) =>
                                checked
                                  ? [...prev, 'full-time']
                                  : prev.filter((v) => v !== 'full-time')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="Full-time"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={availability.includes('part-time')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAvailability((prev) =>
                                checked
                                  ? [...prev, 'part-time']
                                  : prev.filter((v) => v !== 'part-time')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="Part-time"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={availability.includes('casual')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAvailability((prev) =>
                                checked
                                  ? [...prev, 'casual']
                                  : prev.filter((v) => v !== 'casual')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="Casual"
                      />
                    </Box>
                  </Box>
                  <Box mt={2} className="profile__shiftPrefs">
                    <Typography variant="subtitle2" className="profile__subTitle">Shift preference</Typography>
                    <Box className="profile__shiftPrefsOptions">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={shiftPreference.includes('am')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShiftPreference((prev) =>
                                checked
                                  ? [...prev, 'am']
                                  : prev.filter((v) => v !== 'am')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="AM"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={shiftPreference.includes('pm')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShiftPreference((prev) =>
                                checked
                                  ? [...prev, 'pm']
                                  : prev.filter((v) => v !== 'pm')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="PM"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={shiftPreference.includes('split')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShiftPreference((prev) =>
                                checked
                                  ? [...prev, 'split']
                                  : prev.filter((v) => v !== 'split')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="Split shift"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={shiftPreference.includes('weekend')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShiftPreference((prev) =>
                                checked
                                  ? [...prev, 'weekend']
                                  : prev.filter((v) => v !== 'weekend')
                              );
                            }}
                            disabled={loading}
                          />
                        }
                        label="Weekend"
                      />
                    </Box>
                  </Box>
                  <TextField
                    label="Years experience"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                    disabled={loading}
                    fullWidth
                    margin="normal"
                  />
                  <Box mt={2} className="profile__certifications">
                    <Typography variant="subtitle2" className="profile__subTitle">Certifications</Typography>
                    <Box className="profile__certificationsOptions">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={certFoodSafety}
                            onChange={(e) => setCertFoodSafety(e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="Food Safety"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={certRSA}
                            onChange={(e) => setCertRSA(e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="RSA / Alcohol service license"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={certFirstAid}
                            onChange={(e) => setCertFirstAid(e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="First Aid"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={certBarista}
                            onChange={(e) => setCertBarista(e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="Barista certification"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={certHACCP}
                            onChange={(e) => setCertHACCP(e.target.checked)}
                            disabled={loading}
                          />
                        }
                        label="HACCP"
                      />
                    </Box>
                  </Box>
                  <TextField
                    label="Instagram profile link"
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    disabled={loading}
                    fullWidth
                    margin="normal"
                  />
                  <TextField
                    label="LinkedIn profile link"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    disabled={loading}
                    fullWidth
                    margin="normal"
                  />
                </Box>
              </Box>

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
            </>
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
