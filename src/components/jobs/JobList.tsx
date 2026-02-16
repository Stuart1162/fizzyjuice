import { Link as RouterLink } from 'react-router-dom';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
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
  IconButton,
  Tooltip,
  Link as MuiLink,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../contexts/SavedJobsContext';
import '../../styles/joblist.css';
import '../../styles/jobview.css';
import { incrementApply, incrementView } from '../../services/metrics';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [savePromptOpen, setSavePromptOpen] = useState<boolean>(false);

  // Keep refs for each accordion to scroll into view on expand
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!expandedId) return;
    const el = itemRefs.current[expandedId];
    if (!el) return;
    // Scroll to element with an offset to account for fixed navbar
    const NAV_OFFSET = 80; // ~72px toolbar + small spacing
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.pageYOffset - NAV_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
    // Track a view for this job
    try { incrementView(expandedId); } catch {}
  }, [expandedId]);

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

  // Helper: determine if a job is older than 14 days
  const isArchived = (j: Job): boolean => {
    const toMillis = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
      if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
      try { return new Date(ts).getTime() || 0; } catch { return 0; }
    };
    const created = toMillis((j as any).createdAt || (j as any).updatedAt);
    if (!created) return false;
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    return (Date.now() - created) > TWO_WEEKS_MS;
  };

  // Auth and admin detection (must be before filters that depend on it)
  const { currentUser } = useAuth();
  const { isSaved, toggleSave } = useSavedJobs();
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

  // Compute filtered jobs BEFORE any early returns to keep hook order consistent
  const filteredJobs = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const base = jobs.filter((job) => {
      // Hide archived jobs from non-admin users
      if (!isAdmin && isArchived(job)) return false;
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
  }, [jobs, filterText, filters, isAdmin]);

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
        // Non-admin/public lists must only request approved/published to satisfy rules
        const base = collection(db, 'jobs');
        const q = isAdmin
          ? query(base, orderBy('createdAt', 'desc'))
          : query(base, where('draft', '==', false), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        // Filter out archived for non-admin users (drafts are not returned by the query for non-admins)
        const filteredJobs = jobsData.filter(job => (!isArchived(job) || isAdmin));
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
  }, [jobsOverride, isAdmin]);

  

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
    <>
    <Box className="jobList">
      {filteredJobs.length === 0 && (
        <Box className="jobList__empty">
          <Typography variant="h6" align="center" color="textSecondary">
            {jobs.length === 0
              ? 'No jobs found. Be the first to post a job!'
              : 'No jobs match your search.'}
          </Typography>
        </Box>
      )}
      {filteredJobs.length > 0 && filteredJobs.map((job) => (
          <Accordion
            key={job.id}
            disableGutters
            expanded={expandedId === job.id}
            onChange={(_e, isExpanded) => setExpandedId(isExpanded ? (job.id as string) : null)}
            className="jobCard"
            ref={(el) => {
              if (job.id) itemRefs.current[job.id as string] = el;
            }}
            TransitionProps={{
              unmountOnExit: true,
              timeout: { enter: 320, exit: 320 },
              easing: {
                enter: 'cubic-bezier(0.22, 1, 0.36, 1)', /* easeOutCubic */
                exit: 'cubic-bezier(0.22, 1, 0.36, 1)',  /* easeOutCubic for smoother close */
              },
            }}
          >
            <AccordionSummary
              component="div"
              expandIcon={
                <span className="jobRow__expand">
                  {expandedId === job.id ? (
                    <RemoveCircleOutlineIcon className="jobRow__expandIcon" />
                  ) : (
                    <AddCircleOutlineIcon className="jobRow__expandIcon" />
                  )}
                </span>
              }
              className="jobRow"
            >
              <Box className="jobRow__grid">
                <Box className="jobRow__col jobRow__role">
                  <Typography variant="h6" className="jobRow__title">{job.title}</Typography>
                  <Box display="flex" alignItems="center" gap={0.5} className="jobRow__companyRow">
                    <Typography variant="body2" className="jobRow__company">at {job.company}</Typography>
                    {!!(job.wordOnTheStreet && job.wordOnTheStreet.trim().length) && (
                      <Tooltip title="Green Flags">
                        <FlagRoundedIcon sx={{ color: '#38cf6f' }} fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
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
                        e.preventDefault();
                        e.stopPropagation();
                        if (!currentUser) { setSavePromptOpen(true); return; }
                        toggleSave(job);
                      }}
                      onMouseDown={(e) => { e.stopPropagation(); }}
                      onTouchStart={(e) => { e.stopPropagation(); }}
                      disabled={false}
                      className="jobRow__save"
                      sx={{ color: 'var(--color-primary)' }}
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

                <Box className="jobView__markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {job.description}
                  </ReactMarkdown>
                </Box>

                {job.wordOnTheStreet && (
                  <Box mb={2} className="jobView__adminNote">
                    <Box display="flex" alignItems="center" gap={0.5} mb={0.5} className="jobView__adminNoteTitle">
                      <FlagRoundedIcon sx={{ color: '#38cf6f' }} fontSize="small" />
                      <Typography variant="subtitle2" gutterBottom>
                        Green Flags
                      </Typography>
                    </Box>
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

                <Box mt={2} display="flex" alignItems="center" justifyContent="space-between" className="jobView__actions">
                  {/* Left side: Apply button or instructions based on applicationDisplay */}
                  {(() => {
                    const display = job.applicationDisplay || 'email';
                    if (display === 'url' && job.applicationUrl && job.applicationUrl.trim() !== '') {
                      return (
                        <Box display="flex" alignItems="center" gap={1} className="jobView__applyWrap">
                          <Button
                            className="jobView__applyButton"
                            variant="contained"
                            color="primary"
                            href={job.applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => { try { if (job.id) incrementApply(job.id as string); } catch {} }}
                          >
                            Apply Now
                          </Button>
                          {job.ref && (
                            <Chip className="jobRefChip" label={`#${job.ref}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      );
                    }
                    if (display === 'instagram' && (job as any).instagramUrl && ((job as any).instagramUrl as string).trim() !== '') {
                      return (
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500, fontSize: 18 }}>
                            <MuiLink
                              color="primary"
                              href={(job as any).instagramUrl as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => { try { if (job.id) incrementApply(job.id as string); } catch {} }}
                            >
                              Apply via Instagram
                            </MuiLink>
                          </Typography>
                        </Box>
                      );
                    }
                    if (job.contactEmail && job.contactEmail.trim() !== '') {
                      return (
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500, fontSize: 18 }}>
                            To apply send your CV to{' '}
                            <MuiLink
                              color="primary"
                              href={`mailto:${job.contactEmail}?subject=Application for ${job.title} position`}
                              onClick={() => { try { if (job.id) incrementApply(job.id as string); } catch {} }}
                            >
                              {job.contactEmail}
                            </MuiLink>
                          </Typography>
                        </Box>
                      );
                    }
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Application details not provided.
                      </Typography>
                    );
                  })()}

                  {/* Right side: Open Job link (new tab) */}
                  {job.id && (
                    isMobile ? (
                      <IconButton
                        component="a"
                        href={`/jobs/${job.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open job in new tab"
                        className="jobView__openIconBtn"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <Button
                        variant="outlined"
                        color="primary"
                        href={`/jobs/${job.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon fontSize="small" />}
                        className="jobView__openBtn"
                      >
                        Open in new tab
                      </Button>
                    )
                  )}
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
    {/* Save Prompt Dialog for signed-out users */}
    <Dialog
      open={savePromptOpen}
      onClose={() => setSavePromptOpen(false)}
      className="savePrompt"
    >
      <DialogTitle className="savePrompt__title">Create an account to save jobs</DialogTitle>
      <DialogContent className="savePrompt__content">
        <Typography variant="body2">Sign in or create a free account to bookmark jobs and view them later.</Typography>
      </DialogContent>
      <DialogActions className="savePrompt__actions">
        <Button onClick={() => setSavePromptOpen(false)} className="savePrompt__closeBtn">Close</Button>
        <Button component={RouterLink} to="/login" color="inherit" className="savePrompt__signinBtn">Sign in</Button>
        <Button component={RouterLink} to="/register" variant="contained" className="savePrompt__signupBtn">Create account</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

export default JobList;
