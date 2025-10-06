import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
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
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BusinessIcon from '@mui/icons-material/Business';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useSavedJobs } from '../contexts/SavedJobsContext';

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();
  const { isSaved, toggleSave } = useSavedJobs();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
          setJob({ id: docSnap.id, ...docSnap.data() } as Job);
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
            {job.workArrangement && (
              <Chip
                icon={<AccessTimeIcon />}
                label={job.workArrangement}
                variant="outlined"
                size="medium"
              />
            )}
            {job.salary && (
              <Chip
                icon={<AttachMoneyIcon />}
                label={job.salary}
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
            <Typography variant="h5" gutterBottom>
              Role
            </Typography>
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

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button
          variant="outlined"
          onClick={() => navigate('/')}
          startIcon={<ArrowBackIcon />}
        >
          Back to Jobs
        </Button>
        <Box display="flex" gap={1}>
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
          <Button
            variant="contained"
            color="primary"
            href={job.applicationUrl && job.applicationUrl.trim() !== ''
              ? job.applicationUrl
              : `mailto:${job.contactEmail}?subject=Application for ${job.title} position`}
            startIcon={<EmailIcon />}
            target={job.applicationUrl ? '_blank' : undefined}
            rel={job.applicationUrl ? 'noopener noreferrer' : undefined}
          >
            Apply Now
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default JobDetail;
