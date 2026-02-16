import React, { useEffect, useMemo, useState } from 'react';
import { collection, collectionGroup, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types/job';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  IconButton,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EmailIcon from '@mui/icons-material/Email';
import { Link as RouterLink } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSavedJobs } from '../contexts/SavedJobsContext';
import JobList from '../components/jobs/JobList';

import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { savedJobs, loading: savedLoading } = useSavedJobs();
  const [savedJobDocs, setSavedJobDocs] = useState<Job[]>([]);
  const [savedDocsLoading, setSavedDocsLoading] = useState<boolean>(false);
  // jobs: the user's own posted jobs (or all if superadmin) for the Manage Posts table
  const [jobs, setJobs] = useState<Job[]>([]);
  // allJobs: all jobs in the marketplace used to compute the personalised "Your list"
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userStrengths, setUserStrengths] = useState<NonNullable<Job['companyStrengths']>>([] as any);
  const [userRole, setUserRole] = useState<'jobseeker' | 'employer' | 'admin' | null>(null);
  
  // Extended personalisation preferences (loaded from / saved to prefs doc, edited on Personalise page)
  const [prefRoles, setPrefRoles] = useState<NonNullable<Job['roles']>>([] as any);
  const [prefContractTypes, setPrefContractTypes] = useState<Job['jobType'][]>([]);
  const [prefLocation, setPrefLocation] = useState<string>('');
  

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

  // Admin analytics state (superadmin only)
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [strengthCounts, setStrengthCounts] = useState<Record<string, number>>({});
  const [jobseekersWithPrefs, setJobseekersWithPrefs] = useState<number>(0);

  // Load user preferences (strengths) and profile (role)
  useEffect(() => {
    const loadPrefs = async () => {
      if (!currentUser) return;
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'jobseeker');
        const snap = await getDoc(prefRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setUserStrengths((data.companyStrengths || []) as any);
          // Load extended personalisation filters
          setPrefRoles((data.prefRoles || []) as any);
          setPrefContractTypes((data.prefContractTypes || []) as any);
          setPrefLocation((data.prefLocation || '') as string);
        } else {
          setUserStrengths([] as any);
          setPrefRoles([] as any);
          setPrefContractTypes([]);
          setPrefLocation('');
        }
        const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const profSnap = await getDoc(profileRef);
        if (profSnap.exists()) {
          const pdata = profSnap.data() as any;
          if (pdata?.role === 'employer' || pdata?.role === 'jobseeker' || pdata?.role === 'admin') {
            setUserRole(pdata.role);
          } else {
            setUserRole('jobseeker');
          }
        } else {
          setUserRole('jobseeker');
        }
      } catch (e) {
        console.error('Failed to load preferences', e);
      }
    };
    loadPrefs();
  }, [currentUser]);

  // Load analytics for superadmin: aggregate jobseeker preferences across all users
  useEffect(() => {
    const run = async () => {
      if (!isSuperAdmin) return;
      setAnalyticsLoading(true);
      try {
        // Prefer a collection group read of all 'prefs' docs, and filter to the 'jobseeker' doc
        const prefsGroup = await getDocs(collectionGroup(db, 'prefs'));
        const counts: Record<string, number> = {};
        let seekers = 0;
        prefsGroup.docs.forEach((d) => {
          if (d.id !== 'jobseeker') return;
          const data = d.data() as any;
          const arr: string[] = (data.companyStrengths || []) as string[];
          if (arr.length > 0) {
            seekers += 1;
            arr.forEach((s) => {
              counts[s] = (counts[s] || 0) + 1;
            });
          }
        });
        setStrengthCounts(counts);
        setJobseekersWithPrefs(seekers);
      } catch (e) {
        console.error('Failed to load analytics', e);
        // Fallback: iterate users if collection group is not permitted
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const counts: Record<string, number> = {};
          let seekers = 0;
          for (const userDoc of usersSnap.docs) {
            try {
              const jsRef = doc(db, 'users', userDoc.id, 'prefs', 'jobseeker');
              const jsSnap = await getDoc(jsRef);
              if (jsSnap.exists()) {
                const data = jsSnap.data() as any;
                const arr: string[] = (data.companyStrengths || []) as string[];
                if (arr.length > 0) {
                  seekers += 1;
                  arr.forEach((s) => {
                    counts[s] = (counts[s] || 0) + 1;
                  });
                }
              }
            } catch {}
          }
          setStrengthCounts(counts);
          setJobseekersWithPrefs(seekers);
        } catch (e2) {
          console.error('Fallback analytics also failed', e2);
        }
      } finally {
        setAnalyticsLoading(false);
      }
    };
    run();
  }, [isSuperAdmin]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const refPart = j.ref ? ` #${j.ref} ${j.ref}` : '';
      const hay = `${j.title || ''} ${j.company || ''} ${j.location || ''} ${j.description || ''}${refPart}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, searchQuery]);

  // Load full job documents for saved jobs so we can reuse JobList styling
  useEffect(() => {
    const run = async () => {
      if (!currentUser) { setSavedJobDocs([]); return; }
      if (savedLoading) return;
      const ids: string[] = (savedJobs || []).map((s: any) => s.jobId).filter(Boolean);
      if (ids.length === 0) { setSavedJobDocs([]); return; }
      setSavedDocsLoading(true);
      try {
        const docs = await Promise.all(ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, 'jobs', id));
            return snap.exists() ? ({ id: snap.id, ...snap.data() } as Job) : null;
          } catch { return null; }
        }));
        setSavedJobDocs(docs.filter(Boolean) as Job[]);
      } finally {
        setSavedDocsLoading(false);
      }
    };
    run();
  }, [currentUser, savedJobs, savedLoading]);

  // Separate draft and published jobs
  const draftJobs = useMemo(() => filteredJobs.filter(job => job.draft), [filteredJobs]);
  const publishedJobs = useMemo(() => filteredJobs.filter(job => !job.draft), [filteredJobs]);

  // Helper to identify archived jobs (older than 14 days)
  const isArchived = (j: Job): boolean => {
    const toMillis = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
      if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
      try { return new Date(ts).getTime() || 0; } catch { return 0; }
    };
    const createdMs = toMillis((j as any).createdAt || (j as any).updatedAt);
    if (!createdMs) return false;
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    return (Date.now() - createdMs) > TWO_WEEKS_MS;
  };

  const archivedJobs = useMemo(() => filteredJobs.filter(job => !job.draft && isArchived(job)), [filteredJobs]);

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

  // Pagination for Manage Posts section (admins/employers) - not used with accordion layout
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compute personalized list:
  // - Filter by optional user prefs: location contains, roles intersect, contract types include, work arrangement include
  // - Do NOT require a companyStrengths match; instead, compute matchCount for ranking so role-only matches still show
  // - Sort by number of strength matches desc, then recency desc
  const hasAnyPref = useMemo(() => (
    (userStrengths && userStrengths.length > 0) ||
    (prefRoles && (prefRoles as string[]).length > 0) ||
    (prefContractTypes && prefContractTypes.length > 0) ||
    (prefLocation && prefLocation.trim().length > 0)
  ), [userStrengths, prefRoles, prefContractTypes, prefLocation]);

  const yourList = useMemo(() => {
    // If no prefs at all, show nothing to avoid overwhelming list (must opt in)
    if (!hasAnyPref) return [] as Job[];
    const toMillis = (ts: any): number => {
      if (!ts) return 0;
      if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
      if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
      try { return new Date(ts).getTime() || 0; } catch { return 0; }
    };
    const locQ = (prefLocation || '').trim().toLowerCase();
    const rolesPref = (prefRoles || []) as string[];
    const contractsPref = prefContractTypes || [];

    const filtered = allJobs.filter((j) => {
      // Optional filters
      if (locQ) {
        const jl = ((j.location || '') as string).toLowerCase();
        if (!jl.includes(locQ)) return false;
      }
      if (rolesPref.length > 0) {
        const jobRoles = ((j.roles || []) as string[]);
        const hasRole = jobRoles.some((r) => rolesPref.includes(r));
        if (!hasRole) return false;
      }
      if (contractsPref.length > 0) {
        if (!contractsPref.includes(j.jobType)) return false;
      }
      return true;
    });

    const scored = filtered
      .map((j) => {
        const strengths: string[] = ((j as any).companyStrengths || []) as string[];
        const matchCount = (userStrengths && userStrengths.length > 0)
          ? strengths.reduce((acc, s) => acc + ((userStrengths as any).includes(s) ? 1 : 0), 0)
          : 0;
        return { job: j, matchCount, createdAtMs: toMillis((j as any).createdAt || (j as any).updatedAt) };
      });
    scored.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return b.createdAtMs - a.createdAtMs;
    });
    return scored.map((r) => r.job);
  }, [allJobs, hasAnyPref, userStrengths, prefLocation, prefRoles, prefContractTypes]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!currentUser) return;
      // Wait until role is resolved so admins can load all jobs
      if (userRole === null && !isSuperAdmin) return;
      setLoading(true);
      setError(null);
      try {
        const baseRef = collection(db, 'jobs');
        // For Manage Posts: all jobs if superadmin or admin; otherwise only current user's jobs
        const myRef = (isSuperAdmin || userRole === 'admin')
          ? baseRef
          : query(baseRef, where('createdBy', '==', currentUser.uid));
        const mySnap = await getDocs(myRef);
        const myData = mySnap.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
        setJobs(myData);

        // For Personalised list: fetch all jobs regardless of owner, but filter out drafts for non-admins
        const allSnap = await getDocs(baseRef);
        const allData = allSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
        // Filter out drafts for non-admin users
        const filteredAllData = allData.filter(job => !job.draft || (isSuperAdmin || userRole === 'admin'));
        setAllJobs(filteredAllData);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setError('Failed to load jobs.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [currentUser, isSuperAdmin, userRole]);

  const handleApprove = async (jobId: string) => {
    try {
      const ref = doc(db, 'jobs', jobId);
      await updateDoc(ref, { draft: false });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, draft: false } : j));
      setAllJobs(prev => prev.map(j => j.id === jobId ? { ...j, draft: false } : j));
    } catch (e) {
      console.error(e);
      setError('Failed to approve job.');
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteDoc(doc(db, 'jobs', confirmId));
      setJobs(prev => prev.filter(j => j.id !== confirmId));
      setAllJobs(prev => prev.filter(j => j.id !== confirmId));
      setConfirmId(null);
    } catch (e) {
      console.error(e);
      setError('Failed to delete job.');
    }
  };

  const handleRestore = async (jobId: string) => {
    try {
      const ref = doc(db, 'jobs', jobId);
      await updateDoc(ref, { updatedAt: serverTimestamp() });
      // Optimistically update local state
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, updatedAt: new Date() as any } : j));
      setAllJobs(prev => prev.map(j => j.id === jobId ? { ...j, updatedAt: new Date() as any } : j));
    } catch (e) {
      console.error(e);
      setError('Failed to restore job.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }} className="dashboard">
      <Box display="flex" alignItems="center" gap={1} className="dashboard__header">
        <Typography variant="h4" gutterBottom className="dashboard__title">
          {isSuperAdmin ? 'Admin Dashboard' : 'Your Dashboard'}
        </Typography>
        {!isSuperAdmin && userRole === 'admin' && (
          <Chip label="Admin" color="primary" size="small" />
        )}
        {!isSuperAdmin && userRole !== 'admin' && userRole === 'employer' && (
          <Chip label="Employer" color="secondary" size="small" />
        )}
      </Box>
      {(isSuperAdmin || userRole === 'admin' || userRole === 'employer') && (
        <Typography variant="body1" color="text.secondary" gutterBottom className="dashboard__subtitle">
          {isSuperAdmin ? 'Manage all job posts on the site.' : 'View your saved jobs and manage the jobs you have posted.'}
        </Typography>
      )}

      {/* Preferences moved to dedicated page at /dashboard/personalise */}

      {/* Admin Analytics (superadmins only) */}
      {isSuperAdmin && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }} className="dashboard__analytics">
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Jobseeker Preferences Analytics</Typography>
            <Typography variant="body2" color="text.secondary">
              {analyticsLoading ? 'Loading…' : `${jobseekersWithPrefs} jobseekers with preferences`}
            </Typography>
          </Box>
          {analyticsLoading ? (
            <Box display="flex" justifyContent="center" my={2}><CircularProgress size={20} /></Box>
          ) : (
            <Box display="grid" gap={1.25}>
              {COMPANY_STRENGTH_OPTIONS.map((label) => (
                <Box key={label} display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">{label}</Typography>
                  <Chip label={strengthCounts[label] ? strengthCounts[label] : 0} size="small" />
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Your list section first (jobseekers only; hide for employers, admins, and superadmins) */}
      {userRole !== 'employer' && userRole !== 'admin' && !isSuperAdmin && (
      <Paper variant="outlined" sx={{ p: 3, mb: 4 }} className="dashboard__yourList">
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" className="dashboard__yourListTitle">Your list</Typography>
            <Button size="small" component={RouterLink} to="/dashboard/personalise" className="dashboard__personaliseBtn">Personalise</Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {hasAnyPref ? `${yourList.length} matches` : 'Select preferences above'}
          </Typography>
        </Box>
        {!hasAnyPref ? (
          <Typography variant="body2" color="text.secondary">Choose your top 3 strengths on the Personalise page to see matching jobs.</Typography>
        ) : yourList.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No matching jobs yet. Check back soon.</Typography>
        ) : (
          <JobList jobsOverride={yourList} />
        )}
      </Paper>
      )}

      {/* Saved Jobs Section (hidden for superadmins, admins, and employers) */}
      {!isSuperAdmin && userRole !== 'admin' && userRole !== 'employer' && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }} className="dashboard__saved">
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" className="dashboard__savedTitle">Saved Jobs</Typography>
            <Typography variant="body2" color="text.secondary">
              {savedLoading ? 'Loading…' : `${savedJobs.length} saved`}
            </Typography>
          </Box>
          {savedLoading || savedDocsLoading ? (
            <Box display="flex" justifyContent="center" my={2}><CircularProgress size={20} /></Box>
          ) : savedJobDocs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              You haven't saved any jobs yet. Browse jobs on the Home page and click "Save" to bookmark them.
            </Typography>
          ) : (
            <JobList jobsOverride={savedJobDocs} />
          )}
        </Paper>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4} className="dashboard__loading"><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error" mt={2} className="dashboard__error">{error}</Typography>
      ) : (
        <>
          {(isSuperAdmin || userRole === 'employer' || userRole === 'admin') && (
            <>
              {userRole === 'employer' && (
                <Typography variant="h6" gutterBottom>
                  My Jobs
                </Typography>
              )}
              <Box sx={{ mb: 2 }} className="dashboard__manageFilters">
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search jobs (title, company, location, description)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Box>

              {/* Draft Jobs Section */}
              {(isSuperAdmin || userRole === 'admin') && draftJobs.length > 0 && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Draft Jobs ({draftJobs.length})
                  </Typography>
                  <Box sx={{ mb: 3 }} className="dashboard__drafts">
                    {draftJobs.map(job => (
                      <Accordion
                        key={job.id}
                        disableGutters
                        expanded={expandedId === job.id}
                        onChange={(_e, isExpanded) => setExpandedId(isExpanded ? (job.id as string) : null)}
                        className="dashboard__jobAccordion"
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="h6">{job.title}</Typography>
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
                              <Chip icon={<BusinessIcon />} label={job.company} variant="outlined" size="small" />
                              <Chip icon={<LocationOnIcon />} label={job.location} variant="outlined" size="small" />
                              <Chip icon={<AccessTimeIcon />} label={job.jobType} variant="outlined" size="small" />
                              {job.wage && (
                                <Chip icon={<AttachMoneyIcon />} label={job.wage} variant="outlined" size="small" />
                              )}
                              <Chip label="Draft" color="warning" size="small" />
                              <Box sx={{ ml: 'auto' }} display="flex" alignItems="center" gap={1}>
                                <Typography variant="caption" color="text.secondary">
                                  Posted: {formatCreatedAt(job.createdAt)}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box className="dashboard__jobDetails">
                            {job.ref && (
                              <Box mb={2} display="flex" alignItems="center" gap={1}>
                                <Typography variant="subtitle2">Reference</Typography>
                                <Chip label={`#${job.ref}`} size="small" />
                              </Box>
                            )}
                            {job.roles && job.roles.length > 0 && (
                              <Box mb={2}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Role
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                  {job.roles.map((role, idx) => (
                                    <Chip key={idx} label={role} color="primary" variant="outlined" size="small" />
                                  ))}
                                </Box>
                              </Box>
                            )}

                            {(isSuperAdmin || (currentUser && job.createdBy === currentUser.uid)) && job.wordOnTheStreet && (
                              <Box mb={2}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Green Flags
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

                            <Divider sx={{ my: 2 }} />

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
                                {job.description}
                              </ReactMarkdown>
                            </Box>

                            {job.companyStrengths && job.companyStrengths.length > 0 && (
                              <Box mt={2}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Company strengths
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                  {job.companyStrengths.map((s, idx) => (
                                    <Chip key={`${job.id}-strength-${idx}`} label={s} color="success" variant="outlined" size="small" />
                                  ))}
                                </Box>
                              </Box>
                            )}

                            <Box mt={2} display="flex" justifyContent="space-between">
                              <Box />
                              <Box display="flex" gap={1}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="error"
                                  onClick={() => setConfirmId(job.id!)}
                                >
                                  Delete
                                </Button>
                                <Button variant="outlined" size="small" onClick={() => handleApprove(job.id!)}>
                                  Approve
                                </Button>
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
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                </>
              )}

              {/* Published Jobs Section */}
              <Typography variant="h6" gutterBottom sx={{ mt: draftJobs.length > 0 ? 3 : 0 }}>
                Published Jobs ({publishedJobs.length})
              </Typography>
              {publishedJobs.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, mt: 1 }}>
                  <Typography>
                    {searchQuery.trim() ? 'No jobs match your search.' : "You haven't posted any jobs yet."}
                  </Typography>
                  {!searchQuery.trim() && (
                    <Button variant="contained" sx={{ mt: 2 }} component={RouterLink} to="/post-job">
                      Post your first job
                    </Button>
                  )}
                </Paper>
              ) : (
                <Box display="grid" gap={2}>
                  {publishedJobs.map(job => (
                    <Paper key={job.id} variant="outlined" sx={{ p: 2 }} className="dashboard__jobCard">
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box>
                          <Typography variant="h6">{job.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{job.company} • {job.location}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton aria-label="edit" component={RouterLink} to={`/dashboard/edit/${job.id}`}>
                            <EditIcon />
                          </IconButton>
                          <IconButton aria-label="delete" color="error" onClick={() => setConfirmId(job.id!)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        {job.description.length > 160 ? job.description.slice(0, 160) + '…' : job.description}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Archived Jobs Section (admins/superadmins only) */}
              {(isSuperAdmin || userRole === 'admin') && (
                <>
                  <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Archived Jobs ({archivedJobs.length})
                  </Typography>
                  {archivedJobs.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 3, mt: 1 }}>
                      <Typography>No archived jobs in the last 14+ days.</Typography>
                    </Paper>
                  ) : (
                    <Box display="grid" gap={2}>
                      {archivedJobs.map(job => (
                        <Paper key={job.id} variant="outlined" sx={{ p: 2 }} className="dashboard__jobCard">
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box>
                              <Typography variant="h6">{job.title}</Typography>
                              <Typography variant="body2" color="text.secondary">{job.company} • {job.location}</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Button variant="outlined" size="small" onClick={() => handleRestore(job.id!)}>
                                Restore
                              </Button>
                            </Box>
                          </Box>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {job.description.length > 160 ? job.description.slice(0, 160) + '…' : job.description}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)} className="dashboard__confirmDialog">
        <DialogTitle>Delete this job?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
