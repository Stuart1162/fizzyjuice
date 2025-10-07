import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormHelperText,
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
    companyStrengths: [] as NonNullable<Job['companyStrengths']>,
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

  // Generate a unique 5-digit numeric reference and ensure it is not already used
  const getUniqueRef = async (): Promise<string> => {
    const gen = () => (Math.floor(10000 + Math.random() * 90000)).toString();
    let tries = 0;
    while (tries < 10) {
      const ref = gen();
      const qRef = query(collection(db, 'jobs'), where('ref', '==', ref));
      const snap = await getDocs(qRef);
      if (snap.empty) return ref;
      tries += 1;
    }
    // Fallback (extremely unlikely to hit collisions 10 times)
    return gen();
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
            const refCode = await getUniqueRef();
            const jobData = {
              ...draft,
              requirements: [],
              skills: [],
              createdAt: serverTimestamp(),
              createdBy: user ? user.uid : 'anonymous',
              ref: refCode,
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

  // deprecated helpers removed (payment and roles handlers now handled inline)

  // Requirements and skills removed from posting flow
  const COMPANY_STRENGTH_OPTIONS: NonNullable<Job['companyStrengths']> = [
    'Challenging Work',
    'Work-life balance',
    'Recognition',
    'Competitive salary',
    'Great people',
    'Career development',
    'Meaningful work',
    'Flexible work',
    'Employee wellbeing',
    'Transparent decision-making',
    'Innovative product',
    'Respectful communication',
    'diversity',
    'Progressive leadership',
  ];

  const toggleStrength = (value: NonNullable<Job['companyStrengths']>[number]) => {
    setJob(prev => {
      const current = prev.companyStrengths || [];
      const has = current.includes(value);
      if (has) {
        return { ...prev, companyStrengths: current.filter(v => v !== value) as any };
      }
      if (current.length >= 3) {
        // ignore selecting more than 3
        return prev;
      }
      return { ...prev, companyStrengths: [...current, value] as any };
    });
  };

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
        // Always use serverless endpoints in browser to avoid accidental localhost usage in production
        const primaryProdApi = '/api/payments-create-session';
        const secondaryProdApi = '/api/create-checkout-session';
        // Local dev fallbacks hitting the Express server directly
        const tertiaryLocalApi = 'http://localhost:4242/api/payments-create-session';
        const quaternaryLocalApi = 'http://localhost:4242/create-checkout-session';
        let endpoint = primaryProdApi;
        console.info('[PostJob] creating checkout session via', endpoint);
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
          // Final fallback to legacy route name
          endpoint = secondaryProdApi;
          console.info('[PostJob] primary API failed, retrying via', endpoint);
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
        }
        // If still not OK, try direct to local server
        if (!res.ok) {
          try {
            endpoint = tertiaryLocalApi;
            console.info('[PostJob] retrying via', endpoint);
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
          } catch {}
        }
        if (!res.ok) {
          try {
            endpoint = quaternaryLocalApi;
            console.info('[PostJob] retrying via', endpoint);
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
          } catch {}
        }
        const contentType = res.headers.get('content-type') || '';
        const rawBody = await res.text();
        let data: any = null;
        if (contentType.includes('application/json')) {
          try { data = JSON.parse(rawBody); } catch (_) { /* ignore JSON parse error */ }
        }
        if (!res.ok) {
          const msg = (data && (data.error || data.message)) || rawBody || 'Failed to initiate checkout';
          throw new Error(typeof msg === 'string' ? msg : 'Failed to initiate checkout');
        }
        const checkoutUrl = data?.url;
        if (!checkoutUrl) {
          throw new Error('Checkout URL missing from server response');
        }
        window.location.href = checkoutUrl;
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
      const refCode = await getUniqueRef();
      const jobData = {
        ...job,
        requirements: [],
        skills: [],
        createdAt: serverTimestamp(),
        createdBy: user ? user.uid : 'anonymous',
        ref: refCode,
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
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Top 3 company strengths</Typography>
            <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0 }}>
              {COMPANY_STRENGTH_OPTIONS.map((opt) => {
                const selected = (job.companyStrengths || []).includes(opt);
                const disableUnchecked = !selected && (job.companyStrengths || []).length >= 3;
                return (
                  <FormControlLabel
                    key={opt}
                    control={<Checkbox checked={selected} onChange={() => toggleStrength(opt)} disabled={disableUnchecked} />}
                    label={opt}
                  />
                );
              })}
            </FormGroup>
            <FormHelperText>Choose up to 3 options.</FormHelperText>
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
