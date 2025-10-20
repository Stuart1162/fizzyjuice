import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Job } from '../../types/job';
import {
  Typography,
  Button,
  Box,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EmailIcon from '@mui/icons-material/Email';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../contexts/SavedJobsContext';
import '../../styles/joblist.css';
import '../../styles/jobview.css';

interface JobListFilters {
  location?: string;
  roles?: NonNullable<Job['roles']>;
  contractTypes?: Job['jobType'][];
  shifts?: NonNullable<Job['shifts']>;
}

interface JobListProps {
  filterText?: string;
  filters?: JobListFilters;
  // When provided, the list will render these jobs instead of fetching from Firestore
  jobsOverride?: Job[];
}

const JobList: React.FC<JobListProps> = ({ filterText = '', filters, jobsOverride }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCreatedAt = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    // Firestore Timestamp object
    if (typeof createdAt?.toDate === 'function') {
      return createdAt.toDate().toLocaleDateString();
    }
    // Seconds property
    if (typeof createdAt?.seconds === 'number') {
      return new Date(createdAt.seconds * 1000).toLocaleDateString();
    }
    // Fallback if a Date or ISO string
    try {
      return new Date(createdAt).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Compute filtered jobs BEFORE any early returns to keep hook order consistent
  const filteredJobs = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const base = jobs.filter((job) => {
      const haystack = [
        job.title,
        job.company,
        job.location,
        job.description,
        job.ref ? `#${job.ref}` : '',
        job.ref || '',
        ...(job.roles || []),
        ...(job.skills || []),
        ...(job.requirements || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return q ? haystack.includes(q) : true;
    });
    // Apply structured filters if provided
    const f = filters || {};
    const loc = (f.location || '').trim().toLowerCase();
    const selectedRoles = f.roles || [];
    const selectedContracts = f.contractTypes || [];
    const selectedShifts = f.shifts || [];

    return base.filter((job) => {
      // Location contains
      if (loc) {
        const jl = (job.location || '').toLowerCase();
        if (!jl.includes(loc)) return false;
      }
      // Roles intersection
      if (selectedRoles.length > 0) {
        const jobRoles = job.roles || [];
        const hasAny = jobRoles.some((r) => selectedRoles.includes(r));
        if (!hasAny) return false;
      }
      // Contract types
      if (selectedContracts.length > 0) {
        if (!selectedContracts.includes(job.jobType)) return false;
      }
      // Shifts intersection
      if (selectedShifts.length > 0) {
        const jobShifts = job.shifts || [];
        const hasAnyShift = jobShifts.some((s) => selectedShifts.includes(s));
        if (!hasAnyShift) return false;
      }
      return true;
    });
  }, [jobs, filterText, filters]);

  useEffect(() => {
    let cancelled = false;
    const fetchJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        if (jobsOverride && Array.isArray(jobsOverride)) {
          if (!cancelled) {
            setJobs(jobsOverride);
            setLoading(false);
          }
          return;
        }
        const querySnapshot = await getDocs(collection(db, 'jobs'));
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        // Filter out drafts for non-admin users
        const filteredJobs = jobsData.filter(job => !job.draft || isAdmin);
        if (!cancelled) setJobs(filteredJobs);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        if (!cancelled) setError('Failed to load jobs. Please try again later.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchJobs();
    return () => { cancelled = true; };
  }, [jobsOverride]);

  const { currentUser } = useAuth();
  const { isSaved, toggleSave } = useSavedJobs();

  // Admin detection
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
      <Box className="jobList jobList__loading">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="jobList jobList__error">
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="jobList">
      {filteredJobs.length === 0 ? (
        <Box className="jobList__empty">
          <Typography variant="h6" align="center" color="textSecondary">
            {jobs.length === 0
              ? 'No jobs found. Be the first to post a job!'
              : 'No jobs match your search.'}
          </Typography>
        </Box>
      ) : (
        filteredJobs.map((job) => (
          <Accordion
            key={job.id}
            disableGutters
            expanded={expandedId === job.id}
            onChange={(_e, isExpanded) => setExpandedId(isExpanded ? (job.id as string) : null)}
            className="jobCard"
            TransitionProps={{
              unmountOnExit: true,
              timeout: { enter: 320, exit: 320 },
              easing: {
                enter: 'cubic-bezier(0.22, 1, 0.36, 1)', /* easeOutCubic */
                exit: 'cubic-bezier(0.22, 1, 0.36, 1)',  /* easeOutCubic for smoother close */
              },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} className="jobRow">
              <Box className="jobRow__grid">
                <Box className="jobRow__col jobRow__role">
                  <Typography variant="h6" className="jobRow__title">{job.title}</Typography>
                  <Typography variant="body2" className="jobRow__company">at {job.company}</Typography>
                </Box>
                <Box className="jobRow__col jobRow__location">
                  <Typography variant="caption" className="jobRow__label">Location</Typography>
                  <Typography variant="body1">{job.location}</Typography>
                </Box>
                <Box className="jobRow__col jobRow__contract">
                  <Typography variant="caption" className="jobRow__label">Contract</Typography>
                  <Typography variant="body1">{job.jobType}</Typography>
                </Box>
                <Box className="jobRow__col jobRow__wage">
                  <Typography variant="caption" className="jobRow__label">Wage</Typography>
                  <Typography variant="body1">{job.wage || '—'}</Typography>
                </Box>
                <Box className="jobRow__meta">
                  <Typography variant="body2" color="text.secondary">
                    {formatCreatedAt(job.createdAt)}
                  </Typography>
                  <Tooltip title={currentUser ? (isSaved(job.id) ? 'Unsave' : 'Save') : 'Sign in to save'}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!currentUser) return;
                          toggleSave(job);
                        }}
                        disabled={!currentUser}
                        className="jobRow__save"
                        aria-label="save job"
                      >
                        {isSaved(job.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails className="jobView">
              {expandedId === job.id && (
              <Box className="jobView__content">
                {job.ref && (
                  <Box mb={2} display="flex" alignItems="center" gap={1} className="jobView__reference">
                    <Typography variant="subtitle2">Reference</Typography>
                    <Chip label={`#${job.ref}`} size="small" />
                  </Box>
                )}
                {job.roles && job.roles.length > 0 && (
                  <Box mb={2} className="jobView__section jobView__roles">
                    <Typography variant="subtitle2" gutterBottom>
                      Role
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1} className="jobView__rolesList">
                      {job.roles.map((role, idx) => (
                        <Chip key={idx} label={role} color="primary" variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                {(isAdmin || (currentUser && job.createdBy === currentUser.uid)) && job.wordOnTheStreet && (
                  <Box mb={2} className="jobView__adminNote">
                    <Typography variant="subtitle2" gutterBottom className="jobView__adminNoteTitle">
                      Word on the street (Admin only)
                    </Typography>
                    <Box sx={{
                      typography: 'body2',
                      '& h1, & h2, & h3, & h4': { mt: 2, mb: 1 },
                      '& p': { mb: 1.5 },
                      '& ul': { pl: 3, mb: 1.5 },
                      '& ol': { pl: 3, mb: 1.5 },
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

                <Box className="jobView__markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {job.description}
                  </ReactMarkdown>
                </Box>

                {job.companyStrengths && job.companyStrengths.length > 0 && (
                  <Box mt={2} className="jobView__section jobView__strengths">
                    <Typography variant="subtitle2" gutterBottom>
                      Company strengths
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1} className="jobView__strengthsList">
                      {job.companyStrengths.map((s, idx) => (
                        <Chip key={`${job.id}-strength-${idx}`} label={s} color="success" variant="outlined" size="small" />
                      ))}
                    </Box>
                  </Box>
                )}

                <Box mt={2} display="flex" justifyContent="space-between" className="jobView__actions">
                  <Box />
                  <Button
                    className="jobView__applyButton"
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
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};

export default JobList;
