import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
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

const jobTypes: Job['jobType'][] = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
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

const EditJob: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Partial<Job>>({});
  const [rolesDisplay, setRolesDisplay] = useState<string[]>([]);

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
        setJob({
          title: data.title,
          company: data.company,
          location: data.location,
          description: data.description,
          jobType: data.jobType,
          salary: data.salary || '',
          contactEmail: data.contactEmail,
          workArrangement: data.workArrangement || 'Remote',
          roles: data.roles || [],
          applicationUrl: data.applicationUrl || '',
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
      const payload = {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        jobType: job.jobType,
        salary: job.salary || '',
        contactEmail: job.contactEmail,
        workArrangement: job.workArrangement || 'Remote',
        roles: job.roles || [],
        applicationUrl: job.applicationUrl || '',
        updatedAt: serverTimestamp(),
      };
      await updateDoc(ref, payload as any);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setError('Failed to save changes');
    }
  };

  if (loading) {
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
          />
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mt: 2,
        }}>
          <TextField
            label="Salary (optional)"
            name="salary"
            value={job.salary || ''}
            onChange={handleInputChange}
            placeholder="e.g., $50,000 - $70,000"
          />
          <TextField
            required
            label="Contact Email"
            name="contactEmail"
            type="email"
            value={job.contactEmail || ''}
            onChange={handleInputChange}
          />
          <TextField
            select
            label="Remote / Hybrid / Office-based"
            name="workArrangement"
            value={job.workArrangement || 'Remote'}
            onChange={handleInputChange}
          >
            {WORK_ARRANGEMENTS.map((wa) => (
              <MenuItem key={wa} value={wa || ''}>{wa}</MenuItem>
            ))}
          </TextField>
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
            label="Application URL (optional)"
            name="applicationUrl"
            type="url"
            value={job.applicationUrl || ''}
            onChange={handleInputChange}
            placeholder="https://company.com/apply/your-role"
          />
        </Box>

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
