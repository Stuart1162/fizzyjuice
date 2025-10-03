import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Job } from '../types/job';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  MenuItem,
  Autocomplete,
  Chip,
} from '@mui/material';
import RichMarkdownEditor from '../components/editor/RichMarkdownEditor';

const jobTypes = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Temporary',
];

const WORK_ARRANGEMENTS: Array<Job['workArrangement']> = ['Remote', 'Hybrid', 'Office-based'];
const ROLE_OPTIONS: NonNullable<Job['roles']> = [
  'Engineering',
  'Design',
  'Finance',
  'Management',
  'Marketing',
  'Sales',
  'Product',
  'Operations',
  'Other',
];

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Form state excluding requirements and skills (removed from posting UI)
  const [job, setJob] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    jobType: 'Full-time' as Job['jobType'],
    salary: '',
    contactEmail: '',
    workArrangement: 'Remote' as Job['workArrangement'],
    roles: [] as NonNullable<Job['roles']>,
    applicationUrl: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setPaid(params.get('paid') === '1');
  }, [location.search]);

  // Persist and retrieve draft between checkout redirects
  const DRAFT_KEY = 'pendingJobPost';
  const saveDraft = (data: typeof job) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch {}
  };
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  // If returning from Stripe with paid=1 and we have a draft, auto-submit it
  useEffect(() => {
    if (paid && !autoSubmitRef.current) {
      let draft: typeof job | null = null;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        draft = raw ? (JSON.parse(raw) as typeof job) : null;
      } catch {
        draft = null;
      }
      if (draft) {
        autoSubmitRef.current = true;
        void (async () => {
          setIsSubmitting(true);
          setError('');
          try {
            const user = auth.currentUser;
            const jobData = {
              ...draft,
              requirements: [],
              skills: [],
              createdAt: serverTimestamp(),
              createdBy: user ? user.uid : 'anonymous',
            };
            await addDoc(collection(db, 'jobs'), jobData);
            clearDraft();
            navigate('/');
          } catch (err) {
            console.error('Error posting job after payment:', err);
            setError('Payment succeeded but posting failed. Please press Submit again.');
          } finally {
            setIsSubmitting(false);
          }
        })();
      }
    }
  }, [paid, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJob(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePayToPost = async () => {
    try {
      setError('');
      const res = await fetch('http://localhost:4242/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: job.title || 'Job Post',
          successUrl: `${window.location.origin}/post-job?paid=1`,
          cancelUrl: `${window.location.origin}/post-job?paid=0`,
          currency: 'gbp',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to initiate checkout');
      }
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Stripe checkout error', err);
      setError(err?.message || 'Payment initialization failed');
    }
  };

  const handleRolesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target as unknown as { value: string | string[] };
    const next = Array.isArray(value) ? value : (value ? value.split(',') : []);
    setJob(prev => ({
      ...prev,
      roles: next as NonNullable<Job['roles']>,
    }));
  };

  // Requirements and skills removed from posting flow

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!job.title || !job.company || !job.location || !job.description || !job.contactEmail) {
      setError('Please fill in all required fields');
      return;
    }
    // If not paid yet, create checkout session and redirect
    if (!paid) {
      try {
        setIsSubmitting(true);
        saveDraft(job);
        const isLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
        let endpoint = isLocal ? 'http://localhost:4242/create-checkout-session' : '/api/create-checkout-session';
        let res: Response;
        try {
          res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: job.title || 'Job Post',
              successUrl: `${window.location.origin}/post-job?paid=1`,
              cancelUrl: `${window.location.origin}/post-job?paid=0`,
              currency: 'gbp',
            }),
          });
        } catch (e) {
          // Fallback: if localhost is unreachable (e.g., in production), try serverless API
          if (isLocal) {
            endpoint = '/api/create-checkout-session';
            res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: job.title || 'Job Post',
                successUrl: `${window.location.origin}/post-job?paid=1`,
                cancelUrl: `${window.location.origin}/post-job?paid=0`,
                currency: 'gbp',
              }),
            });
          } else {
            throw e;
          }
        }
        const data = await res.json();
        if (!res.ok || !data?.url) throw new Error(data?.error || 'Failed to initiate checkout');
        window.location.href = data.url;
        return;
      } catch (err: any) {
        console.error('Stripe checkout error', err);
        setError(err?.message || 'Payment initialization failed');
        setIsSubmitting(false);
        return;
      }
    }

    // Already paid: submit immediately
    try {
      setIsSubmitting(true);
      const user = auth.currentUser;
      const jobData = {
        ...job,
        requirements: [],
        skills: [],
        createdAt: serverTimestamp(),
        createdBy: user ? user.uid : 'anonymous',
      };
      await addDoc(collection(db, 'jobs'), jobData);
      clearDraft();
      navigate('/');
    } catch (err) {
      console.error('Error posting job:', err);
      setError('Failed to post job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Post a New Job
        </Typography>
        {error && (
          <Typography color="error" paragraph>
            {error}
          </Typography>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <TextField required fullWidth id="title" name="title" label="Job Title" value={job.title} onChange={handleInputChange} margin="normal" />
            <TextField required fullWidth id="company" name="company" label="Company Name" value={job.company} onChange={handleInputChange} margin="normal" />
            <TextField required fullWidth id="location" name="location" label="Location" value={job.location} onChange={handleInputChange} margin="normal" />
            <TextField select fullWidth id="jobType" name="jobType" label="Job Type" value={job.jobType} onChange={handleInputChange} margin="normal">
              {jobTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth id="workArrangement" name="workArrangement" label="Remote / Hybrid / Office-based" value={job.workArrangement} onChange={handleInputChange} margin="normal">
              {WORK_ARRANGEMENTS.map((opt) => (
                <MenuItem key={opt} value={opt || ''}>{opt}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Job Description</Typography>
            <RichMarkdownEditor
              height={420}
              value={job.description}
              onChange={(val) => setJob(prev => ({ ...prev, description: val || '' }))}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Autocomplete
              multiple
              id="roles"
              options={ROLE_OPTIONS}
              value={job.roles as string[]}
              onChange={(_e, newValue) => setJob(prev => ({ ...prev, roles: newValue as NonNullable<Job['roles']> }))}
              renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Role (select one or more)" placeholder="Select roles" />
              )}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 2 }}>
            <TextField fullWidth id="salary" name="salary" label="Salary (optional)" value={job.salary} onChange={handleInputChange} margin="normal" placeholder="e.g., $50,000 - $70,000" />
            <TextField required fullWidth id="contactEmail" name="contactEmail" label="Contact Email" type="email" value={job.contactEmail} onChange={handleInputChange} margin="normal" />
            <TextField fullWidth id="applicationUrl" name="applicationUrl" label="Application URL (optional)" type="url" value={job.applicationUrl} onChange={handleInputChange} margin="normal" />
          </Box>
          <Box mt={4} display="flex" justifyContent="space-between" alignItems="center">
            <Button variant="outlined" color="primary" onClick={() => navigate('/')} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>Submit Job</Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );

};

export default PostJob;
