import React, { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Paper, Box, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { collection, collectionGroup, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Shape for a user profile document located at users/{uid}/prefs/profile
interface UserProfileDoc {
  uid: string;
  email?: string;
  displayName?: string;
  role?: 'jobseeker' | 'employer' | 'admin';
}

interface JobLite {
  id: string;
  createdBy?: string;
  ref?: string;
}

const AdminUsers: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<UserProfileDoc[]>([]);
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'all' | 'jobseeker' | 'employer' | 'admin'>('all');

  // Determine admin role via profile
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all user profiles via collection group query on 'prefs' and take only the 'profile' docs
        const prefsSnap = await getDocs(collectionGroup(db, 'prefs'));
        const list: UserProfileDoc[] = prefsSnap.docs
          .filter((d) => d.id === 'profile')
          .map((d) => {
            const data = d.data() as any;
            // d.ref.path looks like users/{uid}/prefs/profile
            const parts = d.ref.path.split('/');
            const uid = parts.length >= 2 ? parts[1] : '';
            return {
              uid,
              email: data?.email || undefined,
              displayName: data?.displayName || undefined,
              role: data?.role || undefined,
            };
          });
        if (cancelled) return;
        setProfiles(list);
        // Fetch all jobs once and keep only id, createdBy, ref
        const jobsSnap = await getDocs(collection(db, 'jobs'));
        const jobList: JobLite[] = jobsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          .map((j: any) => ({ id: j.id, createdBy: j.createdBy, ref: j.ref }));
        if (cancelled) return;
        setJobs(jobList);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // Compute admin status (role-based) after we have currentUser; superadmin allowed too
  useEffect(() => {
    let isCancelled = false;
    const fetchRole = async () => {
      if (!currentUser) { if (!isCancelled) setIsAdminRole(false); return; }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const data = snap.exists() ? (snap.data() as any) : undefined;
        if (!isCancelled) setIsAdminRole(data?.role === 'admin');
      } catch {
        if (!isCancelled) setIsAdminRole(false);
      }
    };
    fetchRole();
    return () => { isCancelled = true; };
  }, [currentUser]);

  const jobRefsByUser = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const j of jobs) {
      const uid = j.createdBy || '';
      if (!uid) continue;
      if (!map[uid]) map[uid] = [];
      if (j.ref) map[uid].push(j.ref);
    }
    return map;
  }, [jobs]);

  const roleCounts = useMemo(() => {
    return profiles.reduce(
      (acc, p) => {
        const r = p.role as 'jobseeker' | 'employer' | 'admin' | undefined;
        if (r) acc[r] += 1;
        return acc;
      },
      { jobseeker: 0, employer: 0, admin: 0 }
    );
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    if (selectedRole === 'all') return profiles;
    return profiles.filter((p) => p.role === selectedRole);
  }, [profiles, selectedRole]);

  if (!currentUser) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">You must be signed in to view this page.</Alert>
      </Container>
    );
  }

  if (!(isSuperAdmin || isAdminRole)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}><CircularProgress /></Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Users</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="role-filter-label">Filter by role</InputLabel>
            <Select
              labelId="role-filter-label"
              label="Filter by role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="jobseeker">Jobseeker</MenuItem>
              <MenuItem value="employer">Employer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Chip label={`Jobseekers: ${roleCounts.jobseeker}`} size="small" />
            <Chip label={`Employers: ${roleCounts.employer}`} size="small" />
            <Chip label={`Admins: ${roleCounts.admin}`} size="small" />
            <Chip label={`Total: ${profiles.length}`} size="small" variant="outlined" />
          </Box>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Jobs (refs)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProfiles.map((p) => (
              <TableRow key={p.uid}>
                <TableCell>{p.displayName || '—'}</TableCell>
                <TableCell>{p.email || '—'}</TableCell>
                <TableCell>{p.role || '—'}</TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {(jobRefsByUser[p.uid] || []).length > 0 ? (
                      (jobRefsByUser[p.uid] || []).map((ref) => (
                        <Chip key={`${p.uid}-${ref}`} label={`#${ref}`} size="small" variant="outlined" />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">None</Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default AdminUsers;
