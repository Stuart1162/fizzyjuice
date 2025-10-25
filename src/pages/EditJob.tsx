import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types/job';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import RichMarkdownEditor from '../components/editor/RichMarkdownEditor';
import { useSnackbar } from 'notistack';

const jobTypes: Job['jobType'][] = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
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

const EditJob: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Partial<Job>>({});
  const [rolesDisplay, setRolesDisplay] = useState<string[]>([]);
  const [getDesc, setGetDesc] = useState<(() => string) | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheckComplete, setAdminCheckComplete] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('No job id provided');
        setLoading(false);
        return;
      }
      try {
        const ref = doc(db, 'jobs', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Job not found');
          setLoading(false);
          return;
        }
        const data = snap.data() as Job;
        console.log('[EditJob] Loaded from Firestore. description length=', (data.description || '').length);
        setJob({
          title: data.title,
          company: data.company,
          location: data.location,
          postcode: data.postcode || '',
          description: data.description,
          jobType: data.jobType,
          wage: data.wage || '',
          contactEmail: data.contactEmail,
          roles: data.roles || [],
          shifts: data.shifts || [],
          applicationUrl: data.applicationUrl || '',
          wordOnTheStreet: data.wordOnTheStreet || '',
          createdBy: data.createdBy,
        });
        setRolesDisplay(data.roles || []);
      } catch (e) {
        console.error(e);
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    console.log('[EditJob] job.description updated. length=', (job.description || '').length, 'preview="' + (job.description || '').slice(0, 80) + '"');
  }, [job.description]);

  // Check permissions after job data and admin state are loaded
  useEffect(() => {
    if (!adminCheckComplete || !job.title) return;

    const isOwner = !!(currentUser && job.createdBy && job.createdBy === currentUser.uid);
    if (isSuperAdmin || isAdmin || isOwner) {
      if (error === 'You do not have permission to edit this job') {
        setError(null);
      }
      return;
    }

    // Only deny if createdBy is known and mismatched. If missing (legacy job), allow for now.
    if (currentUser && job.createdBy && job.createdBy !== currentUser.uid) {
      setError('You do not have permission to edit this job');
    }
  }, [job, isSuperAdmin, isAdmin, currentUser, adminCheckComplete, error]);

  // Determine if current user is an admin (from profile prefs)
  useEffect(() => {
    const loadRole = async () => {
      if (!currentUser) { 
        setIsAdmin(false); 
        setAdminCheckComplete(true);
        return; 
      }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const role = (snap.exists() ? (snap.data() as any).role : null) as string | null;
        setIsAdmin(role === 'admin');
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminCheckComplete(true);
      }
    };
    loadRole();
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setJob((prev) => ({ ...prev, [name]: value }));
  };

  const handleRolesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target as unknown as { value: string | string[] };
    const next = Array.isArray(value) ? value : (value ? value.split(',') : []);
    setRolesDisplay(next as string[]);
    setJob((prev) => ({ ...prev, roles: next as NonNullable<Job['roles']> }));
  };

  const isValid = useMemo(() => {
    return (
      !!job.title &&
      !!job.company &&
      !!job.location &&
      !!job.description &&
      !!job.contactEmail
    );
  }, [job]);

  const handleSave = async () => {
    if (!id) return;
    if (!isValid) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setError(null);
      const ref = doc(db, 'jobs', id);
      const fromGetter = getDesc ? getDesc() : null;
      const latestDescription = (fromGetter && fromGetter.length > 0)
        ? fromGetter
        : (job.description ?? '');
      if (fromGetter && fromGetter !== job.description) {
        setJob(prev => ({ ...prev, description: fromGetter }));
      }
      const payload = {
        title: job.title,
        company: job.company,
        location: job.location,
        postcode: job.postcode || '',
        description: latestDescription,
        jobType: job.jobType,
        wage: job.wage || '',
        contactEmail: job.contactEmail,
        roles: job.roles || [],
        shifts: job.shifts || [],
        applicationUrl: job.applicationUrl || '',
        wordOnTheStreet: job.wordOnTheStreet || '',
        updatedAt: serverTimestamp(),
      };
      console.info('[EditJob] Saving payload', {
        source: fromGetter ? 'editor-getter' : 'state',
        len: (payload.description || '').length,
        preview: (payload.description || '').slice(0, 60)
      });
      await updateDoc(ref, payload as any);
      // Re-fetch to confirm write before navigating (prevents stale UI)
      const verify = await getDoc(ref);
      const saved = verify.exists() ? (verify.data() as any) : null;
      console.info('[EditJob] After save, stored description length=', (saved?.description || '').length);
      enqueueSnackbar('Job saved', { variant: 'success' });
      navigate(`/jobs/${id}`);
    } catch (e) {
      console.error(e);
      setError('Failed to save changes');
    }
  };

  if (loading || !adminCheckComplete) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Edit Job
        </Typography>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}>
          <TextField
            required
            label="Job Title"
            name="title"
            value={job.title || ''}
            onChange={handleInputChange}
          />
          <TextField
            required
            label="Company"
            name="company"
            value={job.company || ''}
            onChange={handleInputChange}
          />
          <TextField
            required
            label="Location"
            name="location"
            value={job.location || ''}
            onChange={handleInputChange}
          />
          <TextField
            label="Postcode (optional)"
            name="postcode"
            value={job.postcode || ''}
            onChange={handleInputChange}
            placeholder="e.g., SW1A 1AA"
          />
          <TextField
            select
            label="Job Type"
            name="jobType"
            value={job.jobType || 'Full-time'}
            onChange={handleInputChange}
          >
            {jobTypes.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Job Description</Typography>
          <RichMarkdownEditor
            height={420}
            value={job.description || ''}
            onChange={(val) => setJob(prev => ({ ...prev, description: val }))}
            getValueRef={(getter) => setGetDesc(() => getter)}
          />
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Debug: description length { (job.description || '').length }
            </Typography>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f6f6f6', padding: 8, borderRadius: 4, maxHeight: 120, overflow: 'auto', margin: 0 }}>
              { (job.description || '').slice(0, 200) }
            </pre>
          </Box>
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mt: 2,
        }}>
          <TextField
            label="Wage (optional)"
            name="wage"
            value={job.wage || ''}
            onChange={handleInputChange}
            placeholder="e.g., £10-15/hour"
          />
          <TextField
            select
            label="Role (select one or more)"
            name="roles"
            value={rolesDisplay}
            onChange={handleRolesChange}
            SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).join(', ') }}
          >
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role} value={role}>{role}</MenuItem>
            ))}
          </TextField>
          <TextField
            required
            label="Application Email"
            name="contactEmail"
            type="email"
            value={job.contactEmail || ''}
            onChange={handleInputChange}
            helperText="This is where applications will be sent"
          />
          <TextField
            label="Application URL (optional)"
            name="applicationUrl"
            type="url"
            value={job.applicationUrl || ''}
            onChange={handleInputChange}
            placeholder="https://company.com/apply/your-role"
          />
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
              value={job.wordOnTheStreet || ''}
              onChange={handleInputChange}
              placeholder="Share insights about the workplace culture, team atmosphere, or any other internal notes that might be helpful for other admins..."
            />
          </Box>
        )}

        <Box mt={4} display="flex" justifyContent="space-between">
          <Button variant="outlined" onClick={() => navigate('/dashboard')}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!isValid}>Save Changes</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditJob;
export {};
