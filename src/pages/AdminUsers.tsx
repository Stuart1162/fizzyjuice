import React, { useEffect, useMemo, useState } from 'react';
import { Container, Typography, Paper, Box, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem, Stack, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Snackbar } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { collection, collectionGroup, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
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
  const [deleteTarget, setDeleteTarget] = useState<UserProfileDoc | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  // Fetch admin role for current user
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

  // Fetch all user profiles (admins only)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!(isSuperAdmin || isAdminRole)) return;
        setLoading(true);
        setError(null);
        const prefsSnap = await getDocs(collectionGroup(db, 'prefs'));
        const list: UserProfileDoc[] = prefsSnap.docs
          .filter((d) => d.id === 'profile')
          .map((d) => {
            const data = d.data() as any;
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
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isSuperAdmin, isAdminRole]);

  // Fetch jobs only for admins to satisfy security rules
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!(isSuperAdmin || isAdminRole)) return;
        const jobsSnap = await getDocs(collection(db, 'jobs'));
        const jobList: JobLite[] = jobsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
          .map((j: any) => ({ id: j.id, createdBy: j.createdBy, ref: j.ref }));
        if (cancelled) return;
        setJobs(jobList);
      } catch (e) {
        // swallow; UI already gated by admin
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isSuperAdmin, isAdminRole]);

  // (moved above)

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

  const handleRequestDelete = (profile: UserProfileDoc) => {
    if (currentUser && profile.uid === currentUser.uid) {
      setSnackbar({ message: 'You cannot delete your own user from this page.', severity: 'error' });
      return;
    }
    if (profile.role === 'admin' && !isSuperAdmin) {
      setSnackbar({ message: 'Only superadmins can delete admin users.', severity: 'error' });
      return;
    }
    setDeleteTarget(profile);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !deleteTarget.uid) {
      setDeleteTarget(null);
      return;
    }
    setDeletingUid(deleteTarget.uid);
    try {
      const prefRef = doc(db, 'users', deleteTarget.uid, 'prefs', 'profile');
      await deleteDoc(prefRef);
      setProfiles((prev) => prev.filter((p) => p.uid !== deleteTarget.uid));
      setSnackbar({ message: 'User deleted.', severity: 'success' });
    } catch (e: any) {
      setSnackbar({ message: e?.message || 'Failed to delete user.', severity: 'error' });
    } finally {
      setDeletingUid(null);
      setDeleteTarget(null);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(null);
  };

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
              <TableCell align="right">Actions</TableCell>
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
                <TableCell align="right">
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => handleRequestDelete(p)}
                    disabled={deletingUid === p.uid}
                  >
                    {deletingUid === p.uid ? 'Deleting...' : 'Delete'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Dialog open={!!deleteTarget} onClose={() => (deletingUid ? null : setDeleteTarget(null))}>
          <DialogTitle>Delete user</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete {deleteTarget?.displayName || deleteTarget?.email || 'this user'}? This will remove their profile from the system.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)} disabled={!!deletingUid}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDelete} color="error" disabled={!!deletingUid}>
              {deletingUid ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
        {snackbar && (
          <Snackbar
            open
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        )}
      </Paper>
    </Container>
  );
};

export default AdminUsers;
