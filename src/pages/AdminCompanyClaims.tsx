import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
} from 'firebase/firestore';

interface CompanyClaim {
  id: string;
  companySlug: string;
  companyName: string | null;
  claimantUid: string;
  claimantEmail: string | null;
  status: string;
  createdAt?: string;
}

const AdminCompanyClaims: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [claims, setClaims] = useState<CompanyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Determine if current user is an admin (from their profile prefs)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentUser) {
        if (!cancelled) setIsAdminRole(false);
        return;
      }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const data = snap.exists() ? (snap.data() as any) : undefined;
        if (!cancelled) setIsAdminRole(data?.role === 'admin');
      } catch {
        if (!cancelled) setIsAdminRole(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Load pending company claims
  useEffect(() => {
    let cancelled = false;

    const loadClaims = async () => {
      if (!(currentUser && (isSuperAdmin || isAdminRole))) {
        if (!cancelled) {
          setError('You do not have permission to view company claims.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const claimsRef = collection(db, 'companyClaims');
        const q = query(claimsRef, where('status', '==', 'pending'));
        const snap = await getDocs(q);
        if (cancelled) return;
        const items: CompanyClaim[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            companySlug: data.companySlug || '',
            companyName: (data.companyName ?? null) as string | null,
            claimantUid: data.claimantUid || '',
            claimantEmail: (data.claimantEmail ?? null) as string | null,
            status: data.status || 'pending',
            createdAt: data.createdAt,
          };
        });
        items.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        setClaims(items);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load company claims.');
          setClaims([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadClaims();

    return () => {
      cancelled = true;
    };
  }, [currentUser, isSuperAdmin, isAdminRole]);

  const handleApprove = async (claim: CompanyClaim) => {
    if (!currentUser || !(isSuperAdmin || isAdminRole)) return;

    try {
      setProcessingId(claim.id);
      const now = new Date().toISOString();

      // Mark claim as approved
      const claimRef = doc(db, 'companyClaims', claim.id);
      await setDoc(
        claimRef,
        {
          status: 'approved',
          updatedAt: now,
        },
        { merge: true }
      );

      // Set company owner
      const companyRef = doc(db, 'employerProfiles', claim.companySlug);
      await setDoc(
        companyRef,
        {
          ownerUid: claim.claimantUid,
          updatedAt: now,
        },
        { merge: true }
      );

      // Ensure user profile reflects employer ownership
      const userProfileRef = doc(db, 'users', claim.claimantUid, 'prefs', 'profile');
      const userSnap = await getDoc(userProfileRef);
      const userData = userSnap.exists() ? (userSnap.data() as any) : {};
      const nextRole = userData.role && userData.role !== 'jobseeker' ? userData.role : 'employer';

      await setDoc(
        userProfileRef,
        {
          role: nextRole,
          companyName: userData.companyName || claim.companyName || null,
          publicEmployerSlug: claim.companySlug,
          updatedAt: now,
        },
        { merge: true }
      );

      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to approve claim', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claim: CompanyClaim) => {
    if (!currentUser || !(isSuperAdmin || isAdminRole)) return;
    try {
      setProcessingId(claim.id);
      const now = new Date().toISOString();
      const claimRef = doc(db, 'companyClaims', claim.id);
      await setDoc(
        claimRef,
        {
          status: 'rejected',
          updatedAt: now,
        },
        { merge: true }
      );
      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to reject claim', e);
    } finally {
      setProcessingId(null);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">You must be signed in to view this page.</Alert>
      </Container>
    );
  }

  if (!(isSuperAdmin || isAdminRole)) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Company claims
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : claims.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            There are no pending company claims.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Claimant email</TableCell>
                <TableCell>Created at</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell>{claim.companyName || '—'}</TableCell>
                  <TableCell>{claim.companySlug}</TableCell>
                  <TableCell>{claim.claimantEmail || '—'}</TableCell>
                  <TableCell>{claim.createdAt || '—'}</TableCell>
                  <TableCell align="right">
                    <Box display="flex" justifyContent="flex-end" gap={1}>
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => handleApprove(claim)}
                        disabled={processingId === claim.id}
                      >
                        Approve
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleReject(claim)}
                        disabled={processingId === claim.id}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Container>
  );
};

export default AdminCompanyClaims;
