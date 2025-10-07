import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc, getDoc, setDoc, collectionGroup } from 'firebase/firestore';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Pagination,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link as RouterLink } from 'react-router-dom';
import { useSavedJobs } from '../contexts/SavedJobsContext';
import { useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import JobList from '../components/jobs/JobList';

const Dashboard: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { savedJobs, loading: savedLoading, unsaveJob, toggleApplied } = useSavedJobs();
  // jobs: the user's own posted jobs (or all if superadmin) for the Manage Posts table
  const [jobs, setJobs] = useState<Job[]>([]);
  // allJobs: all jobs in the marketplace used to compute the personalised "Your list"
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userStrengths, setUserStrengths] = useState<NonNullable<Job['companyStrengths']>>([] as any);
  const [userRole, setUserRole] = useState<'jobseeker' | 'employer' | null>(null);
  const [prefsLoading, setPrefsLoading] = useState<boolean>(false);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  // Extended personalisation preferences (loaded from / saved to prefs doc, edited on Personalise page)
  const [prefWorkArrangements, setPrefWorkArrangements] = useState<Array<NonNullable<Job['workArrangement']>>>([]);
  const [prefRoles, setPrefRoles] = useState<NonNullable<Job['roles']>>([] as any);
  const [prefContractTypes, setPrefContractTypes] = useState<Job['jobType'][]>([]);
  const [prefLocation, setPrefLocation] = useState<string>('');
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  const COMPANY_STRENGTH_OPTIONS: NonNullable<Job['companyStrengths']> = [
    'Challenging Work',
    'Work-life balance',
    'Recognition',
    'Competitive salary',
    'Great people',
    'Career development',
    'Meaningful work',
    'Flexible work',
    'Employee wellbeing',
    'Transparent decision-making',
    'Innovative product',
    'Respectful communication',
    'diversity',
    'Progressive leadership',
  ];

  // Admin analytics state (superadmin only)
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [strengthCounts, setStrengthCounts] = useState<Record<string, number>>({});
  const [jobseekersWithPrefs, setJobseekersWithPrefs] = useState<number>(0);

  // Load user preferences (strengths) and profile (role)
  useEffect(() => {
    const loadPrefs = async () => {
      if (!currentUser) return;
      setPrefsLoading(true);
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'jobseeker');
        const snap = await getDoc(prefRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setUserStrengths((data.companyStrengths || []) as any);
          // Load extended personalisation filters
          setPrefWorkArrangements((data.prefWorkArrangements || []) as any);
          setPrefRoles((data.prefRoles || []) as any);
          setPrefContractTypes((data.prefContractTypes || []) as any);
          setPrefLocation((data.prefLocation || '') as string);
        } else {
          setUserStrengths([] as any);
          setPrefWorkArrangements([]);
          setPrefRoles([] as any);
          setPrefContractTypes([]);
          setPrefLocation('');
        }
        const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const profSnap = await getDoc(profileRef);
        if (profSnap.exists()) {
          const pdata = profSnap.data() as any;
          if (pdata?.role === 'employer' || pdata?.role === 'jobseeker') {
            setUserRole(pdata.role);
          } else {
            setUserRole('jobseeker');
          }
        } else {
          setUserRole('jobseeker');
        }
      } catch (e) {
        console.error('Failed to load preferences', e);
      } finally {
        setPrefsLoading(false);
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

  const toggleStrength = (value: NonNullable<Job['companyStrengths']>[number]) => {
    setUserStrengths(prev => {
      const has = prev.includes(value);
      if (has) return prev.filter(v => v !== value) as any;
      if (prev.length >= 3) return prev; // limit 3
      return ([...prev, value] as any);
    });
  };

  const savePreferences = async () => {
    if (!currentUser) return;
    try {
      setSavingPrefs(true);
      const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'jobseeker');
      await setDoc(prefRef, { companyStrengths: userStrengths }, { merge: true });
      enqueueSnackbar('Preferences saved', { variant: 'success' });
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Failed to save preferences', { variant: 'error' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const refPart = j.ref ? ` #${j.ref} ${j.ref}` : '';
      const hay = `${j.title || ''} ${j.company || ''} ${j.location || ''} ${j.description || ''}${refPart}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, searchQuery]);

  // Pagination for Manage Posts section (admins/employers)
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 10;
  const pagedJobs = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredJobs.slice(start, start + rowsPerPage);
  }, [filteredJobs, page]);
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Compute personalized list:
  // - Filter by optional user prefs: location contains, roles intersect, contract types include, work arrangement include
  // - Do NOT require a companyStrengths match; instead, compute matchCount for ranking so role-only matches still show
  // - Sort by number of strength matches desc, then recency desc
  const yourList = useMemo(() => {
    // If no prefs at all, show nothing to avoid overwhelming list (must opt in)
    const hasAnyPref = (userStrengths && userStrengths.length > 0) ||
      (prefRoles && (prefRoles as string[]).length > 0) ||
      (prefContractTypes && prefContractTypes.length > 0) ||
      (prefWorkArrangements && (prefWorkArrangements as string[]).length > 0) ||
      (prefLocation && prefLocation.trim().length > 0);
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
    const workArrPref = (prefWorkArrangements || []) as string[];

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
      if (workArrPref.length > 0) {
        const wa = (j.workArrangement || '') as string;
        if (!workArrPref.includes(wa)) return false;
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
  }, [allJobs, userStrengths, prefLocation, prefRoles, prefContractTypes, prefWorkArrangements]);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError(null);
      try {
        const baseRef = collection(db, 'jobs');
        // For Manage Posts: current user's jobs unless superadmin
        const myRef = isSuperAdmin ? baseRef : query(baseRef, where('createdBy', '==', currentUser.uid));
        const mySnap = await getDocs(myRef);
        const myData = mySnap.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
        setJobs(myData);

        // For Personalised list: fetch all jobs regardless of owner
        const allSnap = await getDocs(baseRef);
        const allData = allSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
        setAllJobs(allData);
      } catch (err) {
        console.error('Error loading jobs:', err);
        setError('Failed to load jobs.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [currentUser, isSuperAdmin]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteDoc(doc(db, 'jobs', confirmId));
      setJobs(prev => prev.filter(j => j.id !== confirmId));
      setConfirmId(null);
    } catch (e) {
      console.error(e);
      setError('Failed to delete job.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        {isSuperAdmin ? 'Admin Dashboard' : 'Your Dashboard'}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {isSuperAdmin ? 'Manage all job posts on the site.' : 'View your saved jobs and manage the jobs you have posted.'}
      </Typography>

      {/* Preferences moved to dedicated page at /dashboard/personalise */}

      {/* Admin Analytics (superadmins only) */}
      {isSuperAdmin && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
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

      {/* Your list section first (jobseekers only; hide for employers and superadmins) */}
      {userRole !== 'employer' && !isSuperAdmin && (
      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">Your list</Typography>
            <Button size="small" component={RouterLink} to="/dashboard/personalise">Personalise</Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {userStrengths.length > 0 ? `${yourList.length} matches` : 'Select preferences above'}
          </Typography>
        </Box>
        {userStrengths.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Choose your top 3 strengths on the Personalise page to see matching jobs.</Typography>
        ) : yourList.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No matching jobs yet. Check back soon.</Typography>
        ) : (
          <JobList jobsOverride={yourList} />
        )}
      </Paper>
      )}

      {/* Saved Jobs Section (hidden for superadmins) */}
      {!isSuperAdmin && (
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Saved Jobs</Typography>
            <Typography variant="body2" color="text.secondary">
              {savedLoading ? 'Loading…' : `${savedJobs.length} saved`}
            </Typography>
          </Box>
          {savedLoading ? (
            <Box display="flex" justifyContent="center" my={2}><CircularProgress size={20} /></Box>
          ) : savedJobs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              You haven't saved any jobs yet. Browse jobs on the Home page and click "Save" to bookmark them.
            </Typography>
          ) : (
            <Box display="grid" gap={1.5}>
              {savedJobs.map((s) => (
                <Box key={s.jobId} display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">{s.title}</Typography>
                      {s.applied && (
                        <Chip label="Applied" color="success" size="small" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">{s.company} • {s.location}</Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button component={RouterLink} to={`/jobs/${s.jobId}`} variant="outlined" size="small">View</Button>
                    <Button variant="outlined" color={s.applied ? 'warning' : 'primary'} size="small" onClick={() => toggleApplied(s.jobId)}>
                      {s.applied ? 'Mark not applied' : 'Mark as applied'}
                    </Button>
                    <Button color="error" variant="text" size="small" onClick={() => unsaveJob(s.jobId)}>Unsave</Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error" mt={2}>{error}</Typography>
      ) : (
        <>
          {(isSuperAdmin || userRole === 'employer') && (
            <>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search jobs (title, company, location, description)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Box>
              {filteredJobs.length === 0 ? (
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
                  {pagedJobs.map(job => (
                    <Paper key={job.id} variant="outlined" sx={{ p: 2 }}>
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
                  <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                      count={Math.max(1, Math.ceil(filteredJobs.length / rowsPerPage))}
                      page={page}
                      onChange={(_e, value) => setPage(value)}
                      color="primary"
                    />
                  </Box>
                </Box>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)}>
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
