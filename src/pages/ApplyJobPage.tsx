import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Link as MuiLink,
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types/job';
import { useSnackbar } from 'notistack';
import { supabase } from '../supabaseClient';
import { incrementApply } from '../services/metrics';

const ApplyJobPage: React.FC = () => {
  const { id: routeId } = useParams();
  const id = routeId as string | undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSummary, setProfileSummary] = useState<any | null>(null);
  const [cvOverrideUrl, setCvOverrideUrl] = useState<string | null>(null);
  const [cvOverrideName, setCvOverrideName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login', { state: { from: location } });
      return;
    }
  }, [currentUser, navigate, location]);

  useEffect(() => {
    let cancelled = false;
    const fetchJob = async () => {
      if (!id) {
        setError('No job ID provided');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'jobs', id);
        const docSnap = await getDoc(docRef);
        if (!cancelled) {
          if (docSnap.exists()) {
            const full = { id: docSnap.id, ...docSnap.data() } as Job;
            setJob(full);
          } else {
            setError('Job not found');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load job');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchJob();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadApplicantProfile = async () => {
    if (!currentUser || profileLoaded || profileLoading) return;
    setProfileLoading(true);
    try {
      const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        const data = snap.data() as any;
        const availability = Array.isArray(data.availability)
          ? data.availability
          : data.availability
            ? [data.availability]
            : [];
        const shiftPreference = Array.isArray(data.shiftPreference)
          ? data.shiftPreference
          : data.shiftPreference
            ? [data.shiftPreference]
            : [];
        const certifications: string[] = [];
        if (data.certFoodSafety) certifications.push('Food Safety');
        if (data.certRSA) certifications.push('RSA / Alcohol service license');
        if (data.certFirstAid) certifications.push('First Aid');
        if (data.certBarista) certifications.push('Barista certification');
        if (data.certHACCP) certifications.push('HACCP');
        const summary: any = {
          name: data.displayName || currentUser.displayName || '',
          email: currentUser.email,
          preferredJobTitle: data.preferredJobTitle || '',
          locationCity: data.jobLocationCity || '',
          postcode: data.jobPostcode || '',
          availability,
          shiftPreference,
          yearsExperience: data.yearsExperience || '',
          instagramUrl: data.instagramUrl || '',
          linkedinUrl: data.linkedinUrl || '',
          certifications,
          cvUrl: data.cvUrl || null,
          cvFileName: data.cvFileName || null,
        };
        setProfileSummary(summary);
      } else {
        setProfileSummary({
          name: currentUser.displayName || '',
          email: currentUser.email,
          cvUrl: null,
          cvFileName: null,
        });
      }
      setProfileLoaded(true);
    } catch (e) {
      enqueueSnackbar('Could not load your profile details. Please update your profile before applying.', { variant: 'error' });
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadApplicantProfile();
    }
  }, [currentUser]);

  const handlePickCv = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCvReplaceChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    if (!currentUser) return;
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('CV file is too large (max 5MB).', { variant: 'error' });
      return;
    }
    try {
      const path = `${currentUser.uid}/apply-${Date.now()}-${file.name}`;
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
      setCvOverrideUrl(url);
      setCvOverrideName(file.name);
      enqueueSnackbar('CV selected for this application.', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar('Failed to upload CV for this application.', { variant: 'error' });
    }
  };

  const handleSubmit = async () => {
    if (!job || !currentUser || !job.contactEmail) return;
    try {
      setSubmitting(true);
      if (!profileLoaded) {
        await loadApplicantProfile();
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const profileUrl = origin ? `${origin}/profile` : '';
      const summary = profileSummary || {
        name: currentUser.displayName || '',
        email: currentUser.email,
      };

      const body = {
        employerEmail: job.contactEmail.trim(),
        jobTitle: job.title,
        jobId: job.id,
        applicantName: summary.name,
        applicantEmail: currentUser.email,
        coverLetter,
        profileUrl,
        cvUrl: cvOverrideUrl || summary.cvUrl || null,
        profileSummary: {
          preferredJobTitle: summary.preferredJobTitle,
          locationCity: summary.locationCity,
          postcode: summary.postcode,
          availability: summary.availability,
          shiftPreference: summary.shiftPreference,
          yearsExperience: summary.yearsExperience,
          instagramUrl: summary.instagramUrl,
          linkedinUrl: summary.linkedinUrl,
          certifications: summary.certifications,
        },
      };

      // Primary endpoint for production / serverless
      let endpoint = '/api/apply-via-email';
      let res: Response;

      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (e) {
        // Network / CORS error – fall back to local dev server
        endpoint = 'http://localhost:4242/api/apply-via-email';
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      // If the primary endpoint responded but with a non-OK status (e.g. 404 from CRA dev server),
      // retry against the local Express server on port 4242, mirroring the PostJob pattern.
      if (!res.ok) {
        try {
          endpoint = 'http://localhost:4242/api/apply-via-email';
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        } catch {}
      }

      if (!res.ok) {
        throw new Error('Application request failed');
      }

      try { if (job.id) await incrementApply(job.id as string); } catch {}

      navigate(`/jobs/${job.id}/applied`);
    } catch (e) {
      enqueueSnackbar('Failed to send application. Please try again.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !job) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          {error || 'Job not found'}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/')}>Back to Jobs</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }} className="jobViewPage">
      <Box mb={3} className="jobViewPage__backRow">
        <Button variant="text" color="primary" onClick={() => navigate(`/jobs/${job.id}`)}>
          Back to job
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4 }} className="jobViewPage__card">
        <Box mb={3} className="jobViewPage__header">
          <Typography variant="h4" component="h1" gutterBottom className="jobViewPage__title">
            {job.title}
          </Typography>
          <Typography variant="h6" component="p" className="jobViewPage__company">
            At {job.company}
          </Typography>
        </Box>

        <Box
          display="flex"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={4}
          mb={3}
          className="jobViewPage__metaRow"
        >
          <Box className="jobRow__col jobRow__location jobViewPage__metaCol">
            <Typography variant="caption" className="jobRow__label">Location</Typography>
            <Typography variant="body1" className="jobViewPage__metaValue jobViewPage__metaValue--location">
              {job.location}
              {job.postcode ? `, ${job.postcode}` : ''}
            </Typography>
          </Box>
          <Box className="jobRow__col jobRow__contract jobViewPage__metaCol">
            <Typography variant="caption" className="jobRow__label">Contract</Typography>
            <Typography variant="body1" className="jobViewPage__metaValue jobViewPage__metaValue--contract">
              {job.jobType}
            </Typography>
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Your CV
          </Typography>
          {cvOverrideUrl && cvOverrideName ? (
            <Typography variant="body2">
              Using CV for this application:{' '}
              <MuiLink href={cvOverrideUrl} target="_blank" rel="noopener noreferrer">
                {cvOverrideName}
              </MuiLink>
            </Typography>
          ) : profileSummary?.cvUrl && profileSummary?.cvFileName ? (
            <Typography variant="body2">
              Using CV from your profile:{' '}
              <MuiLink href={profileSummary.cvUrl} target="_blank" rel="noopener noreferrer">
                {profileSummary.cvFileName}
              </MuiLink>
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              You haven't uploaded a CV yet.
            </Typography>
          )}
          <Box mt={1}>
            <Button variant="outlined" size="small" onClick={handlePickCv} disabled={profileLoading || submitting}>
              {cvOverrideUrl ? 'Replace CV' : 'Upload or replace CV'}
            </Button>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.rtf,.txt"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleCvReplaceChange}
            />
          </Box>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Cover letter
          </Typography>
          <TextField
            placeholder="Write a short cover letter to the employer..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            multiline
            minRows={5}
            fullWidth
          />
        </Box>

        <Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleSubmit}
            disabled={submitting || profileLoading}
          >
            {submitting ? 'Sending application...' : 'Send application'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApplyJobPage;
