import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TablePagination,
  TextField,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { collectionGroup, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Link as RouterLink } from 'react-router-dom';

interface JobseekerProfileDoc {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  availability?: string[];
  shiftPreference?: string[];
  jobRoleInterests?: string[];
  yearsExperience?: string | null;
  jobLocationCity?: string | null;
  jobPostcode?: string | null;
  linkedinUrl?: string | null;
  certFoodSafety?: boolean;
  certRSA?: boolean;
  certFirstAid?: boolean;
  certBarista?: boolean;
  certHACCP?: boolean;
  createdAt?: any;
}

const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
];

const SHIFT_OPTIONS = [
  { value: 'am', label: 'AM' },
  { value: 'pm', label: 'PM' },
  { value: 'split', label: 'Split shift' },
  { value: 'weekend', label: 'Weekend' },
];

const ROLE_OPTIONS = [
  'Baker',
  'Chef',
  'Head Chef',
  'Barista',
  'Front of House',
  'Catering',
  'Kitchen Porter',
  'Butcher',
  'Breakfast Chef',
  'Pizza Chef',
  'Manager',
  'Other',
];

const CERT_OPTIONS = [
  { key: 'certFoodSafety', label: 'Food Safety' },
  { key: 'certRSA', label: 'RSA / Alcohol service' },
  { key: 'certFirstAid', label: 'First Aid' },
  { key: 'certBarista', label: 'Barista' },
  { key: 'certHACCP', label: 'HACCP' },
] as const;

const MENU_PROPS = {
  PaperProps: {
    style: {
      maxHeight: 48 * 4.5 + 8,
    },
  },
};

const AdminJobseekers: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<JobseekerProfileDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminRole, setIsAdminRole] = useState(false);

  const [availabilityFilter, setAvailabilityFilter] = useState<string[]>([]);
  const [shiftFilter, setShiftFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [certFilter, setCertFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [page, setPage] = useState(0);
  const ROWS_PER_PAGE = 30;

  useEffect(() => {
    let isCancelled = false;
    const fetchRole = async () => {
      if (!currentUser) {
        if (!isCancelled) setIsAdminRole(false);
        return;
      }
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
    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!(isSuperAdmin || isAdminRole)) return;
        setLoading(true);
        setError(null);
        const prefsSnap = await getDocs(collectionGroup(db, 'prefs'));
        const list: JobseekerProfileDoc[] = prefsSnap.docs
          .filter((d) => d.id === 'profile')
          .map((d) => {
            const data = d.data() as any;
            const parts = d.ref.path.split('/');
            const uid = parts.length >= 2 ? parts[1] : '';
            return {
              uid,
              email: data?.email || undefined,
              displayName: data?.displayName || undefined,
              availability: Array.isArray(data?.availability)
                ? (data.availability as string[])
                : data?.availability
                ? [data.availability]
                : [],
              shiftPreference: Array.isArray(data?.shiftPreference)
                ? (data.shiftPreference as string[])
                : data?.shiftPreference
                ? [data.shiftPreference]
                : [],
              jobRoleInterests: Array.isArray(data?.jobRoleInterests)
                ? (data.jobRoleInterests as string[])
                : data?.jobRoleInterests
                ? [data.jobRoleInterests]
                : [],
              yearsExperience: data?.yearsExperience || null,
              jobLocationCity: data?.jobLocationCity || null,
              jobPostcode: data?.jobPostcode || null,
              linkedinUrl: data?.linkedinUrl || null,
              certFoodSafety: !!data?.certFoodSafety,
              certRSA: !!data?.certRSA,
              certFirstAid: !!data?.certFirstAid,
              certBarista: !!data?.certBarista,
              certHACCP: !!data?.certHACCP,
              createdAt: data?.createdAt ?? null,
              role: data?.role,
            };
          })
          .filter((profile) => profile.role === 'jobseeker');
        if (cancelled) return;
        setProfiles(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load jobseekers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, isAdminRole]);

  const filteredProfiles = useMemo(() => {
    const matches = (profile: JobseekerProfileDoc) => {
      const hasAvailability =
        availabilityFilter.length === 0 || availabilityFilter.every((opt) => profile.availability?.includes(opt));
      const hasShift = shiftFilter.length === 0 || shiftFilter.every((opt) => profile.shiftPreference?.includes(opt));
      const hasRoles = roleFilter.length === 0 || roleFilter.every((opt) => profile.jobRoleInterests?.includes(opt));
      const hasCerts =
        certFilter.length === 0 ||
        certFilter.every((key) => {
          return Boolean((profile as any)[key]);
        });
      const locationHaystack = `${profile.jobLocationCity || ''} ${profile.jobPostcode || ''}`.toLowerCase();
      const hasLocation =
        locationFilter.trim().length === 0 ||
        locationHaystack.includes(locationFilter.trim().toLowerCase());
      return hasAvailability && hasShift && hasRoles && hasCerts && hasLocation;
    };

    const getMillis = (p: JobseekerProfileDoc): number => {
      const v = p.createdAt as any;
      if (!v) return 0;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const t = Date.parse(v);
        return Number.isNaN(t) ? 0 : t;
      }
      if (typeof v?.toMillis === 'function') {
        try {
          return v.toMillis();
        } catch {
          return 0;
        }
      }
      return 0;
    };

    return profiles.filter(matches).sort((a, b) => getMillis(b) - getMillis(a));
  }, [profiles, availabilityFilter, shiftFilter, roleFilter, certFilter, locationFilter]);

  useEffect(() => {
    setPage(0);
  }, [availabilityFilter, shiftFilter, roleFilter, certFilter, locationFilter]);

  const paginatedProfiles = useMemo(() => {
    const start = page * ROWS_PER_PAGE;
    return filteredProfiles.slice(start, start + ROWS_PER_PAGE);
  }, [filteredProfiles, page]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const renderList = (items?: string[]) => {
    if (!items || items.length === 0) return '—';
    return (
      <Box display="flex" gap={0.5} flexWrap="wrap">
        {items.map((item) => (
          <Chip key={item} label={item} size="small" />
        ))}
      </Box>
    );
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
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
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
        <Typography variant="h4" gutterBottom>
          Jobseeker Profiles
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} alignItems={{ xs: 'stretch', md: 'center' }}>
          <FormControl fullWidth size="small">
            <InputLabel id="availability-filter-label">Availability</InputLabel>
            <Select
              labelId="availability-filter-label"
              multiple
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as string[])}
              input={<OutlinedInput label="Availability" />}
              renderValue={(selected) => selected.map((value) => AVAILABILITY_OPTIONS.find((opt) => opt.value === value)?.label || value).join(', ')}
              MenuProps={MENU_PROPS}
            >
              {AVAILABILITY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Checkbox checked={availabilityFilter.indexOf(opt.value) > -1} />
                  <ListItemText primary={opt.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="shift-filter-label">Shift preference</InputLabel>
            <Select
              labelId="shift-filter-label"
              multiple
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value as string[])}
              input={<OutlinedInput label="Shift preference" />}
              renderValue={(selected) => selected.map((value) => SHIFT_OPTIONS.find((opt) => opt.value === value)?.label || value).join(', ')}
              MenuProps={MENU_PROPS}
            >
              {SHIFT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Checkbox checked={shiftFilter.indexOf(opt.value) > -1} />
                  <ListItemText primary={opt.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="roles-filter-label">Roles</InputLabel>
            <Select
              labelId="roles-filter-label"
              multiple
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as string[])}
              input={<OutlinedInput label="Roles" />}
              renderValue={(selected) => selected.join(', ')}
              MenuProps={MENU_PROPS}
            >
              {ROLE_OPTIONS.map((role) => (
                <MenuItem key={role} value={role}>
                  <Checkbox checked={roleFilter.indexOf(role) > -1} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="cert-filter-label">Certifications</InputLabel>
            <Select
              labelId="cert-filter-label"
              multiple
              value={certFilter}
              onChange={(e) => setCertFilter(e.target.value as string[])}
              input={<OutlinedInput label="Certifications" />}
              renderValue={(selected) => selected
                .map((key) => CERT_OPTIONS.find((opt) => opt.key === key)?.label || key)
                .join(', ')
              }
              MenuProps={MENU_PROPS}
            >
              {CERT_OPTIONS.map((opt) => (
                <MenuItem key={opt.key} value={opt.key}>
                  <Checkbox checked={certFilter.indexOf(opt.key) > -1} />
                  <ListItemText primary={opt.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Location search"
            size="small"
            fullWidth
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="City or postcode"
          />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Availability</TableCell>
              <TableCell>Shift pref.</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Certifications</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Years exp.</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedProfiles.map((profile) => (
              <TableRow key={profile.uid}>
                <TableCell>{profile.displayName || '—'}</TableCell>
                <TableCell>{profile.email || '—'}</TableCell>
                <TableCell>{renderList(profile.availability)}</TableCell>
                <TableCell>{renderList(profile.shiftPreference)}</TableCell>
                <TableCell>{renderList(profile.jobRoleInterests)}</TableCell>
                <TableCell>
                  {CERT_OPTIONS.filter((opt) => (profile as any)[opt.key]).length > 0 ? (
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      {CERT_OPTIONS.filter((opt) => (profile as any)[opt.key]).map((opt) => (
                        <Chip key={opt.key} label={opt.label} size="small" color="success" variant="outlined" />
                      ))}
                    </Box>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {profile.jobLocationCity || profile.jobPostcode
                    ? `${profile.jobLocationCity || ''}${profile.jobLocationCity && profile.jobPostcode ? ', ' : ''}${
                        profile.jobPostcode || ''
                      }`
                    : '—'}
                </TableCell>
                <TableCell>{profile.yearsExperience || '—'}</TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="text"
                    component={RouterLink}
                    to={`/admin/users/${profile.uid}/profile`}
                  >
                    View profile
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredProfiles.length}
          rowsPerPage={ROWS_PER_PAGE}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
          labelRowsPerPage="Rows per page"
          showFirstButton
          showLastButton
        />
      </Paper>
    </Container>
  );
};

export default AdminJobseekers;
