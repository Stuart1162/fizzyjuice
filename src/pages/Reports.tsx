import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Container, Typography, Paper, Box, CircularProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types/job';

export default function Reports() {
  const { currentUser, isSuperAdmin } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Record<string, {views?: number; saves?: number; applies?: number}>>({});
  const [isAdminRole, setIsAdminRole] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      if (!currentUser) { setIsAdminRole(false); return; }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const role = (snap.exists() ? (snap.data() as any).role : null) as string | null;
        if (!cancelled) setIsAdminRole(role === 'admin');
      } catch {
        if (!cancelled) setIsAdminRole(false);
      }
    };
    loadRole();
    return () => { cancelled = true; };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        const jobsSnap = await getDocs(collection(db, 'jobs'));
        const rows = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Job));
        if (cancelled) return;
        setJobs(rows);
        // fetch metrics per job
        const metricsEntries: Record<string, {views?: number; saves?: number; applies?: number}> = {};
        await Promise.all(rows.map(async (j) => {
          const m = await getDoc(doc(db, 'jobMetrics', j.id as string));
          metricsEntries[j.id as string] = (m.exists() ? (m.data() as any) : {});
        }));
        if (cancelled) return;
        setMetrics(metricsEntries);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  if (!currentUser) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>You must be signed in to view reports.</Typography>
      </Container>
    );
  }

  if (!(isSuperAdmin || isAdminRole)) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>You do not have permission to view Reports.</Typography>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const toMillis = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
    try { return new Date(ts).getTime() || 0; } catch { return 0; }
  };
  const isArchived = (j: Job): boolean => {
    const createdAtMs = toMillis((j as any).createdAt || (j as any).updatedAt);
    if (!createdAtMs) return false;
    const ageMs = Date.now() - createdAtMs;
    return ageMs > 14 * 24 * 60 * 60 * 1000;
  };
  const activeJobs = jobs
    .filter((j) => !j.draft && !isArchived(j))
    .sort((a, b) => toMillis((b as any).createdAt || (b as any).updatedAt) - toMillis((a as any).createdAt || (a as any).updatedAt));

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" gutterBottom>Reports</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ref</TableCell>
              <TableCell>Job</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Views</TableCell>
              <TableCell>Saves</TableCell>
              <TableCell>Applies</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeJobs.map((j) => {
              const m = metrics[j.id as string] || {};
              return (
                <TableRow key={j.id}>
                  <TableCell>{j.ref ? `#${j.ref}` : '-'}</TableCell>
                  <TableCell>{j.title}</TableCell>
                  <TableCell>{j.company}</TableCell>
                  <TableCell>{m.views || 0}</TableCell>
                  <TableCell>{m.saves || 0}</TableCell>
                  <TableCell>{m.applies || 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
