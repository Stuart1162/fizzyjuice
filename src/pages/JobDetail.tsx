import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types/job';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FlagIcon from '@mui/icons-material/Flag';
import EmailIcon from '@mui/icons-material/Email';
import { useSavedJobs } from '../contexts/SavedJobsContext';
import { incrementApply, incrementView } from '../services/metrics';

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();
  const { isSaved, toggleSave } = useSavedJobs();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        setError('No job ID provided');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'jobs', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const full = { id: docSnap.id, ...docSnap.data() } as Job;
          // Backfill a 5-digit ref if missing (only admins/superadmins)
          if (!full.ref && (isSuperAdmin || isAdmin)) {
            const gen = () => (Math.floor(10000 + Math.random() * 90000)).toString();
            let refCode = gen();
            try {
              // Ensure uniqueness with a short query loop
              let attempts = 0;
              while (attempts < 5) {
                const qRef = query(collection(db, 'jobs'), where('ref', '==', refCode));
                const snap = await getDocs(qRef);
                if (snap.empty) break;
                refCode = gen();
                attempts += 1;
              }
              await updateDoc(doc(db, 'jobs', docSnap.id), { ref: refCode });
              full.ref = refCode;
            } catch {}
          }
          setJob(full);
          try { if (full.id) await incrementView(full.id as string); } catch {}
        } else {
          setError('Job not found');
        }
      } catch (err) {
        console.error('Error fetching job:', err);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  // Determine if current user is an admin (from profile prefs)
  useEffect(() => {
    const loadRole = async () => {
      if (!currentUser) { setIsAdmin(false); return; }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const role = (snap.exists() ? (snap.data() as any).role : null) as string | null;
        setIsAdmin(role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    };
    loadRole();
  }, [currentUser]);

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
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Jobs
        </Button>
      </Container>
    );
  }

  const formatDate = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    if (typeof createdAt?.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString();
    }
    if (typeof createdAt?.seconds === 'number') {
      return new Date(createdAt.seconds * 1000).toLocaleDateString();
    }
    try {
      return new Date(createdAt).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Box mb={3}>
        <IconButton onClick={() => navigate(-1)} color="primary" sx={{ mb: 2 }}>
          <ArrowBackIcon />
          <Typography variant="body1" ml={1}>
            Back to Jobs
          </Typography>
        </IconButton>
      </Box>

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box mb={4}>
          <Typography variant="h3" component="h1" gutterBottom>
            {job.title}
          </Typography>
          
          <Box display="flex" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
            <Chip
              icon={<BusinessIcon />}
              label={job.company}
              variant="outlined"
              size="medium"
            />
            <Chip
              icon={<LocationOnIcon />}
              label={job.location}
              variant="outlined"
              size="medium"
            />
            <Chip
              icon={<AccessTimeIcon />}
              label={job.jobType}
              variant="outlined"
              size="medium"
            />
            {job.wage && (
              <Chip
                icon={<AttachMoneyIcon />}
                label={job.wage}
                variant="outlined"
                size="medium"
              />
            )}
          </Box>

          <Box display="flex" alignItems="center" mt={2}>
            <EmailIcon color="action" sx={{ mr: 1 }} />
            <Typography variant="body1" color="text.secondary">
              {job.contactEmail}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box mb={4}>
          <Typography variant="h5" gutterBottom>
            Job Description
          </Typography>
          <Box sx={{
            typography: 'body1',
            '& h1, & h2, & h3, & h4': { mt: 2, mb: 1 },
            '& p': { mb: 2 },
            '& ul': { pl: 3, mb: 2 },
            '& ol': { pl: 3, mb: 2 },
            '& code': {
              bgcolor: 'action.hover',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            },
            '& pre': {
              bgcolor: 'action.hover',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              mb: 2,
            },
            '& a': { color: 'primary.main' },
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {job.description}
            </ReactMarkdown>
          </Box>
        </Box>

        {job.wordOnTheStreet && (
          <Box mb={4}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <FlagIcon color="success" />
              <Typography variant="h5" gutterBottom>
                Green Flags
              </Typography>
            </Box>
            <Box sx={{
              typography: 'body1',
              '& h1, & h2, & h3, & h4': { mt: 2, mb: 1 },
              '& p': { mb: 2 },
              '& ul': { pl: 3, mb: 2 },
              '& ol': { pl: 3, mb: 2 },
              '& code': {
                bgcolor: 'action.hover',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              },
              '& pre': {
                bgcolor: 'action.hover',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                mb: 2,
              },
              '& a': { color: 'primary.main' },
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {job.wordOnTheStreet}
              </ReactMarkdown>
            </Box>
          </Box>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <Box mb={4}>
            <Typography variant="h5" gutterBottom>
              Requirements
            </Typography>
            <List dense>
              {job.requirements.map((requirement, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemText primary={`• ${requirement}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {job.roles && job.roles.length > 0 && (
          <Box mb={4}>
            
            <Box display="flex" flexWrap="wrap" gap={1}>
              {job.roles.map((role, index) => (
                <Chip
                  key={index}
                  label={role}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {job.companyStrengths && job.companyStrengths.length > 0 && (
          <Box mb={4}>
            <Typography variant="h5" gutterBottom>
              Company strengths
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {job.companyStrengths.map((s, index) => (
                <Chip
                  key={index}
                  label={s}
                  color="success"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        {job.skills && job.skills.length > 0 && (
          <Box mb={4}>
            <Typography variant="h5" gutterBottom>
              Skills
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {job.skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </Box>
        )}

        

        <Box mt={4} pt={2} borderTop={1} borderColor="divider">
          <Typography variant="body2" color="text.secondary">
            Posted on: {formatDate(job.createdAt)}
          </Typography>
        </Box>
      </Paper>

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={4}>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
          startIcon={<ArrowBackIcon />}
        >
          Back to Jobs
        </Button>
        <Box display="flex" gap={2} alignItems="center">
          {currentUser && (
            <Button
              variant={isSaved(job.id) ? 'contained' : 'outlined'}
              color="primary"
              startIcon={isSaved(job.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
              onClick={() => toggleSave(job)}
            >
              {isSaved(job.id) ? 'Saved' : 'Save'}
            </Button>
          )}
          {(currentUser && (isSuperAdmin || (job as any).createdBy === currentUser.uid)) && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/dashboard/edit/${job.id}`)}
              startIcon={<ArrowBackIcon />}
            >
              Edit Job
            </Button>
          )}
          <Box display="flex" alignItems="center" gap={1}>
            {job.ref && (
              <Chip className="jobRefChip" label={`#${job.ref}`} size="small" variant="outlined" />
            )}
            <Button
              variant="contained"
              color="primary"
              href={job.applicationUrl && job.applicationUrl.trim() !== ''
                ? job.applicationUrl
                : `mailto:${job.contactEmail}?subject=Application for ${job.title} position`}
              target={job.applicationUrl ? '_blank' : undefined}
              rel={job.applicationUrl ? 'noopener noreferrer' : undefined}
              onClick={() => { try { if (job.id) incrementApply(job.id); } catch {} }}
            >
              Apply Now
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default JobDetail;
