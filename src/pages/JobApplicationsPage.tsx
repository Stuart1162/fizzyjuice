import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Link as MuiLink,
  Snackbar,
  Alert,
} from '@mui/material';
import { Job } from '../types/job';
import '../styles/job-applications.css';

interface ApplicationRecord {
  id: string;
  jobId: string | null;
  jobTitle?: string;
  employerId?: string | null;
  employerEmail?: string | null;
  applicantId?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  coverLetter?: string | null;
  cvUrl?: string | null;
  profileSummary?: any;
  appliedAt?: any;
  status?: 'new' | 'shortlisted' | 'rejected';
}

const JobApplicationsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const { currentUser, isSuperAdmin } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'shortlisted' | 'rejected'>('new');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusMessageOpen, setStatusMessageOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!currentUser || !jobId) {
        setLoading(false);
        setError('You must be signed in to view applications.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const jobRef = doc(db, 'jobs', jobId);
        const snap = await getDoc(jobRef);
        if (!snap.exists()) {
          setError('Job not found');
          setJob(null);
          setAllowed(false);
          return;
        }
        const jobData = { id: snap.id, ...snap.data() } as Job;
        setJob(jobData);

        const isOwner = (jobData as any).createdBy === currentUser.uid;
        const canView = isSuperAdmin || isOwner;
        setAllowed(canView);
        if (!canView) {
          setError('You do not have permission to view applications for this job.');
          return;
        }

        const appsRef = collection(db, 'applications');
        const appsQuery = query(appsRef, where('jobId', '==', jobId));
        const appsSnap = await getDocs(appsQuery);
        const rows: ApplicationRecord[] = appsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setApplications(rows);
      } catch (e) {
        console.error('Failed to load applications', e);
        setError('Failed to load applications.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentUser, isSuperAdmin, jobId]);

  const formatDate = (ts: any): string => {
    if (!ts) return '';
    if (typeof ts?.toDate === 'function') {
      return ts.toDate().toLocaleString();
    }
    if (typeof ts?.seconds === 'number') {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return '';
    }
  };

  const newCount = useMemo(() => {
    if (!applications || applications.length === 0) return 0;
    return applications.filter((app) => (app.status || 'new') === 'new').length;
  }, [applications]);

  const shortlistedCount = useMemo(() => {
    if (!applications || applications.length === 0) return 0;
    return applications.filter((app) => (app.status || 'new') === 'shortlisted').length;
  }, [applications]);

  const rejectedCount = useMemo(() => {
    if (!applications || applications.length === 0) return 0;
    return applications.filter((app) => (app.status || 'new') === 'rejected').length;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    if (!applications || applications.length === 0) return [] as ApplicationRecord[];
    return applications.filter((app) => {
      const status = app.status || 'new';
      return status === activeTab;
    });
  }, [applications, activeTab]);

  const handleChangeStatus = async (app: ApplicationRecord, newStatus: 'new' | 'shortlisted' | 'rejected') => {
    setUpdatingId(app.id);
    try {
      const appRef = doc(db, 'applications', app.id);
      await updateDoc(appRef, { status: newStatus });
      setApplications((prevApps) =>
        prevApps.map((prevApp) =>
          prevApp.id === app.id ? { ...prevApp, status: newStatus } : prevApp
        )
      );
      let message: string | null = null;
      if (newStatus === 'shortlisted') {
        message = 'Moved to shortlisted';
      } else if (newStatus === 'rejected') {
        message = 'Moved to rejected';
      } else {
        message = 'Status updated';
      }
      setStatusMessage(message);
      setStatusMessageOpen(true);
    } catch (e) {
      console.error('Failed to update application status', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusMessageClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') return;
    setStatusMessageOpen(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }} className="applicationsPage applicationsPage--message">
        <Typography>You must be signed in to view applications.</Typography>
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }} className="applicationsPage applicationsPage--message">
        <Typography>{error || 'You do not have permission to view applications for this job.'}</Typography>
      </Container>
    );
  }

  if (!job) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }} className="applicationsPage applicationsPage--message">
        <Typography>{error || 'Job not found.'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }} className="applicationsPage">
      <Box
        mb={2}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        className="applicationsPage__header"
      >
        <Box className="applicationsPage__jobInfo">
          <Typography variant="h5" gutterBottom className="applicationsPage__title">
            Applications for {job.title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            className="applicationsPage__meta"
          >
            {job.company} • {job.location}
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/dashboard"
          variant="outlined"
          size="small"
          className="applicationsPage__backButton"
        >
          Back to dashboard
        </Button>
      </Box>

      <Box className="applicationsPage__tabs" mb={2}>
        <button
          type="button"
          className={`applicationsPage__tab ${activeTab === 'new' ? 'applicationsPage__tab--active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          New ({newCount})
        </button>
        <button
          type="button"
          className={`applicationsPage__tab ${activeTab === 'shortlisted' ? 'applicationsPage__tab--active' : ''}`}
          onClick={() => setActiveTab('shortlisted')}
        >
          Shortlisted ({shortlistedCount})
        </button>
        <button
          type="button"
          className={`applicationsPage__tab ${activeTab === 'rejected' ? 'applicationsPage__tab--active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected ({rejectedCount})
        </button>
      </Box>

      {error ? (
        <Paper variant="outlined" sx={{ p: 3 }} className="applicationsPage__error">
          <Typography variant="body1">{error}</Typography>
        </Paper>
      ) : filteredApplications.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3 }} className="applicationsPage__empty">
          <Typography variant="body1">
            {activeTab === 'new'
              ? 'No new applications yet for this job.'
              : activeTab === 'shortlisted'
              ? 'No shortlisted applications yet.'
              : 'No rejected applications yet.'}
          </Typography>
        </Paper>
      ) : (
        <Box display="grid" gap={2} className="applicationsPage__list">
          {filteredApplications.map((app) => (
            <Paper
              key={app.id}
              variant="outlined"
              sx={{ p: 2 }}
              className="applicationsPage__card"
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={2}
                className="applicationsPage__cardHeader"
              >
                <Box className="applicationsPage__cardHeaderLeft">
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 500 }}
                    className="applicationsPage__applicantName"
                  >
                    {app.applicantName || 'Unknown applicant'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="applicationsPage__applicantEmail"
                  >
                    {app.applicantEmail}
                  </Typography>
                </Box>
                <Box className="applicationsPage__cardHeaderRight">
                  {app.cvUrl && (
                    <Button
                      variant="contained"
                      size="small"
                      className="applicationsPage__cvButton"
                      component="a"
                      href={app.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View CV
                    </Button>
                  )}
                  <Box className="applicationsPage__actions">
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      disabled={
                        updatingId === app.id ||
                        app.status === 'rejected' ||
                        activeTab === 'rejected'
                      }
                      onClick={() => handleChangeStatus(app, 'rejected')}
                    >
                      {app.status === 'rejected' ? 'Rejected' : 'Reject'}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={
                        updatingId === app.id ||
                        app.status === 'shortlisted' ||
                        activeTab === 'shortlisted'
                      }
                      onClick={() => handleChangeStatus(app, 'shortlisted')}
                    >
                      {app.status === 'shortlisted' ? 'Shortlisted' : 'Add to shortlist'}
                    </Button>
                  </Box>
                </Box>
              </Box>

              {app.coverLetter && (
                <Box
                  mb={2}
                  className="applicationsPage__section applicationsPage__section--coverLetter"
                >
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    className="applicationsPage__sectionTitle"
                  >
                    Cover Letter
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-line' }}
                    className="applicationsPage__sectionBody"
                  >
                    {app.coverLetter}
                  </Typography>
                </Box>
              )}

              {app.profileSummary && (
                <Box
                  mt={1}
                  className="applicationsPage__section applicationsPage__section--profile"
                >
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    className="applicationsPage__sectionTitle"
                  >
                    Additional details
                  </Typography>
                  <Box className="applicationsPage__details">
                    {app.profileSummary.locationCity && (
                      <Typography variant="body2" className="applicationsPage__detailRow">
                        <strong>Location:</strong> {app.profileSummary.locationCity}
                      </Typography>
                    )}
                    {app.profileSummary.yearsExperience && (
                      <Typography variant="body2" className="applicationsPage__detailRow">
                        <strong>Years Experience:</strong> {app.profileSummary.yearsExperience}
                      </Typography>
                    )}
                    {Array.isArray(app.profileSummary.certifications) &&
                      app.profileSummary.certifications.length > 0 && (
                        <Typography variant="body2" className="applicationsPage__detailRow">
                          <strong>Certifications:</strong>{' '}
                          {app.profileSummary.certifications.join(', ')}
                        </Typography>
                      )}
                  </Box>
                </Box>
              )}

            </Paper>
          ))}
        </Box>
      )}

      <Snackbar
        open={statusMessageOpen && Boolean(statusMessage)}
        autoHideDuration={3000}
        onClose={handleStatusMessageClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleStatusMessageClose}
          severity="success"
          variant="filled"
          sx={{ fontSize: '0.85rem', py: 0.5, px: 1.5 }}
        >
          {statusMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default JobApplicationsPage;
