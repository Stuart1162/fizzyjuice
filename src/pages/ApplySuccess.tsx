import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
} from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Job } from '../types/job';

const ApplySuccess: React.FC = () => {
  const { id: routeId } = useParams();
  const id = routeId as string | undefined;
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        const snap = await getDoc(docRef);
        if (!cancelled) {
          if (snap.exists()) {
            setJob({ id: snap.id, ...(snap.data() as any) } as Job);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !job) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }} className="applySuccessPage applySuccessPage--error">
        <Typography variant="h5" color="error" gutterBottom className="applySuccessPage__errorTitle">
          {error || 'Job not found'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/')}
          className="applySuccessPage__primaryButton applySuccessPage__primaryButton--backToJobs"
        >
          Back to Jobs
        </Button>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{ mt: 4, mb: 6 }}
      className="jobViewPage applySuccessPage"
    >
      <Box mb={3} className="jobViewPage__backRow applySuccessPage__backRow">
        <Button
          variant="text"
          color="primary"
          onClick={() => navigate(`/jobs/${job.id}`)}
          className="jobViewPage__backBtn applySuccessPage__backBtn"
        >
          Back to job
        </Button>
      </Box>

      <Paper elevation={3} sx={{ p: 4 }} className="jobViewPage__card applySuccessPage__card">
        <Box mb={3} className="applySuccessPage__header">
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            className="applySuccessPage__title"
          >
            Application successful
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            className="applySuccessPage__summary"
          >
            Your application for <strong>{job.title}</strong>
            {job.company ? (
              <>
                {' '}
                at <strong>{job.company}</strong>
              </>
            ) : null}{' '}
            has been sent.
          </Typography>
        </Box>

        <Box mt={2} className="applySuccessPage__descriptionWrap">
          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            className="applySuccessPage__description"
          >
            We've emailed your details to the employer. They'll contact you directly if they'd like to move forward.
          </Typography>
        </Box>

        <Box
          mt={4}
          display="flex"
          gap={2}
          flexWrap="wrap"
          className="applySuccessPage__actions"
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="applySuccessPage__primaryButton applySuccessPage__primaryButton--viewJob"
          >
            View job again
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/')}
            className="applySuccessPage__secondaryButton applySuccessPage__secondaryButton--browseJobs"
          >
            Browse more jobs
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ApplySuccess;
