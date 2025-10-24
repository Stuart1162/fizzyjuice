import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
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
  'Temporary',
];

const ROLE_OPTIONS: NonNullable<Job['roles']> = [
  'Baker',
  'Chef',
  'Head Chef',
  'Barista',
  'Front of House',
  'Catering',
  'Kitchen Porter',
  'Butcher',
  'Breakfast Chef',
  'Pizza Chef',
  'Manager',
  'Other',
];
const SHIFT_OPTIONS: NonNullable<Job['shifts']> = ['morning', 'afternoon', 'evening'];

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isSuperAdmin } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'jobseeker' | 'employer' | 'admin' | null>(null);
  // Form state excluding requirements and skills (removed from posting UI)
  const [job, setJob] = useState({
    title: '',
    company: '',
    location: '',
    postcode: '',
    description: '',
    jobType: 'Full-time' as Job['jobType'],
    wage: '',
    contactEmail: '',
    roles: [] as NonNullable<Job['roles']>,
    shifts: [] as NonNullable<Job['shifts']>,
    applicationUrl: '',
    companyStrengths: [] as NonNullable<Job['companyStrengths']>,
    wordOnTheStreet: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paid, setPaid] = useState(false);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setPaid(params.get('paid') === '1');
  }, [location.search]);

  // Determine if current user is an admin (from profile prefs)
  useEffect(() => {
    const loadRole = async () => {
      if (!currentUser) { setIsAdmin(false); setUserRole(null); return; }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const role = (snap.exists() ? (snap.data() as any).role : null) as string | null;
        setIsAdmin(role === 'admin');
        setUserRole(role as 'jobseeker' | 'employer' | 'admin' | null);
      } catch {
        setIsAdmin(false);
        setUserRole(null);
      }
    };
    loadRole();
  }, [currentUser]);

  // Load draft from localStorage if exists
  useEffect(() => {
    if (!paid) {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        const draft = raw ? (JSON.parse(raw) as typeof job) : null;
        if (draft) {
          setJob(draft);
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, [paid]);

  // Autopopulate contact email for employers
  useEffect(() => {
    if (currentUser && userRole === 'employer' && !job.contactEmail) {
      setJob(prev => ({ ...prev, contactEmail: currentUser.email || '' }));
    }
  }, [currentUser, userRole, job.contactEmail]);

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
    'Flexible hours',
    'Early finish',
    'Consistent rota',
    'No late finishes',
    'Paid breaks',
    'Actual breaks',
    'Living wage',
    'Tips shared fairly',
    'Staff meals',
    'Free parking',
    'Paid holidays',
    'Inclusive and diverse team',
    'LGBTQ+ Friendly',
    'Female run',
    'Friendly team',
    'Team socials',
    'Sustainable sourcing',
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

    console.log('handleSubmit called with userRole:', userRole, 'isSuperAdmin:', isSuperAdmin, 'isAdmin:', isAdmin);

    // Employers can post as draft without paying - always use draft path
    if (userRole === 'employer') {
      console.log('Taking employer draft path');
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
          draft: true, // Pending admin approval
        };
        await addDoc(collection(db, 'jobs'), jobData);
        clearDraft();
        // Show success message and redirect
        setError('');
        setIsSubmitting(false);
        navigate('/');
      } catch (err) {
        console.error('Error posting job as draft:', err);
        setError('Failed to post job. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Admins and superadmins can post without paying
    if (isSuperAdmin || isAdmin) {
      console.log('Taking admin path');
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
          draft: false, // Approved immediately for admins
        };
        await addDoc(collection(db, 'jobs'), jobData);
        clearDraft();
        navigate('/');
      } catch (err) {
        console.error('Error posting job as admin:', err);
        setError('Failed to post job. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    console.log('No special role detected, checking payment status. paid:', paid);

    // For other users, still require payment (or disable for now)
    // If not paid yet, create checkout session and redirect
    if (!paid) {
      console.log('Trying Stripe payment');
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
    console.log('Already paid, submitting job');
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
            <TextField fullWidth id="postcode" name="postcode" label="Postcode (optional)" value={job.postcode} onChange={handleInputChange} margin="normal" placeholder="e.g., SW1A 1AA" />
            <TextField select fullWidth id="jobType" name="jobType" label="Job Type" value={job.jobType} onChange={handleInputChange} margin="normal">
              {jobTypes.map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
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
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Shifts</Typography>
            <FormGroup row sx={{ mb: 2 }}>
              {SHIFT_OPTIONS.map((shift) => (
                <FormControlLabel
                  key={shift}
                  control={
                    <Checkbox
                      checked={(job.shifts || []).includes(shift)}
                      onChange={() =>
                        setJob(prev => ({
                          ...prev,
                          shifts: prev.shifts?.includes(shift)
                            ? prev.shifts.filter(s => s !== shift)
                            : [...(prev.shifts || []), shift]
                        }))
                      }
                    />
                  }
                  label={shift.charAt(0).toUpperCase() + shift.slice(1)}
                />
              ))}
            </FormGroup>
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
          {(isSuperAdmin || isAdmin) && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>Green Flags (Admin only)</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="wordOnTheStreet"
                label="Internal notes about company culture, team dynamics, etc."
                value={job.wordOnTheStreet}
                onChange={handleInputChange}
                placeholder="Share insights about the workplace culture, team atmosphere, or any other internal notes that might be helpful for other admins..."
              />
            </Box>
          )}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mt: 2 }}>
            <TextField fullWidth id="wage" name="wage" label="Wage (optional)" value={job.wage} onChange={handleInputChange} margin="normal" placeholder="e.g., £10-15/hour" />
            <TextField required fullWidth id="contactEmail" name="contactEmail" label="Application Email" type="email" value={job.contactEmail} onChange={handleInputChange} margin="normal" helperText="This is where applications will be sent" />
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
