import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Job } from '../types/job';
import '../styles/employer-directory.css';

interface DirectoryEmployer {
  id: string;
  slug: string;
  companyName: string | null;
  shortDescription?: string | null;
  location?: string | null;
  postcode?: string | null;
  livingWageEmployer?: boolean | null;
  businessTypes?: string[];
  ownerUid?: string | null;
}

const BUSINESS_TYPE_OPTIONS: string[] = [
  'Restaurant',
  'Cafe',
  'Bakery',
  'Pub',
  'Bar',
  'Production',
  'Hotel',
  'Other',
];

// Shared helpers to keep the "live job" definition consistent with EmployerPublicProfile
const toMillis = (ts: any): number => {
  if (!ts) return 0;
  if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  try {
    return new Date(ts).getTime() || 0;
  } catch {
    return 0;
  }
};

const isArchived = (job: Job): boolean => {
  const created = toMillis((job as any).createdAt || (job as any).updatedAt);
  if (!created) return false;
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - created > TWO_WEEKS_MS;
};

const EmployerDirectory: React.FC = () => {
  const [employers, setEmployers] = useState<DirectoryEmployer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string[]>([]);
  const [onlyLivingWage, setOnlyLivingWage] = useState(false);
  const [liveJobCounts, setLiveJobCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const ref = collection(db, 'employerProfiles');
        const snap = await getDocs(ref);
        const items: DirectoryEmployer[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            slug: d.id,
            companyName: (data.companyName ?? null) as string | null,
            shortDescription: (data.shortDescription ?? null) as string | null,
            location: (data.location ?? null) as string | null,
            postcode: (data.postcode ?? null) as string | null,
            livingWageEmployer: (data.livingWageEmployer ?? null) as boolean | null,
            businessTypes: Array.isArray(data.businessTypes) ? (data.businessTypes as string[]) : [],
            ownerUid: (data.ownerUid ?? null) as string | null,
          };
        });
        const withNames = items.filter((e) => (e.companyName ?? '').toString().trim().length > 0);
        withNames.sort((a, b) => (a.companyName || '').localeCompare(b.companyName || ''));
        setEmployers(withNames);
      } catch (e) {
        console.error('Failed to load employers', e);
        setError('Failed to load employers.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  // Load live job counts for all employers. We query non-draft jobs and then apply the
  // same archival window as EmployerPublicProfile so counts stay consistent.
  useEffect(() => {
    let cancelled = false;

    const loadLiveJobCounts = async () => {
      try {
        const baseRef = collection(db, 'jobs');
        const q = query(baseRef, where('draft', '==', false));
        const snap = await getDocs(q);
        if (cancelled) return;
        const jobs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Job[];

        const counts: Record<string, number> = {};
        for (const job of jobs) {
          if (isArchived(job)) continue;
          const createdBy = (job as any).createdBy as string | undefined | null;
          if (!createdBy) continue;
          counts[createdBy] = (counts[createdBy] || 0) + 1;
        }
        if (!cancelled) {
          setLiveJobCounts(counts);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[EmployerDirectory] Failed to load live job counts', e);
        if (!cancelled) {
          setLiveJobCounts({});
        }
      }
    };

    void loadLiveJobCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleBusinessTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setBusinessTypeFilter(typeof value === 'string' ? value.split(',') : value);
  };

  const filteredEmployers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const selectedTypes = businessTypeFilter;

    return employers.filter((e) => {
      if (onlyLivingWage && !e.livingWageEmployer) {
        return false;
      }

      if (selectedTypes.length > 0) {
        const types = e.businessTypes || [];
        const hasAny = types.some((t) => selectedTypes.includes(t));
        if (!hasAny) return false;
      }

      if (q) {
        const haystack = [
          e.companyName || '',
          e.shortDescription || '',
          e.location || '',
          e.postcode || '',
          ...(e.businessTypes || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    employers,
    searchText,
    businessTypeFilter,
    onlyLivingWage,
  ]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }} className="employer-directory">
      <Box mb={4} className="employer-directory__header">
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{ fontFamily: 'Anton, sans-serif', fontSize: '3rem', letterSpacing: '-0.04em' }}
        >
          Companies
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          className="employer-directory__intro"
        >
          Hospitality companies that care about their people.
        </Typography>
      </Box>

      <Box
        mb={3}
        display="flex"
        flexDirection={{ xs: 'column', md: 'row' }}
        gap={2}
        alignItems="flex-start"
        className="employer-directory__filtersRow employer-directory__filtersRow--location"
      >
        <TextField
          label="Search by name or description"
          variant="outlined"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          fullWidth
          className="employer-directory__searchInput"
        />

        <FormControl
          sx={{ minWidth: 220 }}
          className="employer-directory__businessTypeFilter"
        >
          <InputLabel id="business-type-label">Business type</InputLabel>
          <Select
            labelId="business-type-label"
            multiple
            value={businessTypeFilter}
            onChange={handleBusinessTypeChange}
            input={<OutlinedInput label="Business type" />}
            renderValue={(selected) => (selected as string[]).join(', ')}
          >
            {BUSINESS_TYPE_OPTIONS.map((type) => (
              <MenuItem
                key={type}
                value={type}
                className="employer-directory__businessTypeOption"
              >
                <Checkbox
                  checked={businessTypeFilter.indexOf(type) > -1}
                  className="employer-directory__businessTypeCheckbox"
                />
                <Typography
                  variant="body2"
                  className="employer-directory__businessTypeLabel"
                >
                  {type}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              checked={onlyLivingWage}
              onChange={(e) => setOnlyLivingWage(e.target.checked)}
              className="employer-directory__livingWageCheckbox"
            />
          }
          label="Living Wage Employer only"
          className="employer-directory__livingWageToggle"
        />
      </Box>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          mt={4}
          className="employer-directory__loading"
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography
          color="error"
          mt={2}
          className="employer-directory__error"
        >
          {error}
        </Typography>
      ) : filteredEmployers.length === 0 ? (
        <Typography
          mt={2}
          color="text.secondary"
          className="employer-directory__empty"
        >
          No employers match your filters.
        </Typography>
      ) : (
        <Box mt={2} className="employer-directory__results">
          {filteredEmployers.map((e) => (
            <Box
              key={e.id}
              mb={2.5}
              pb={2.5}
              borderBottom="1px dotted rgba(59,25,6,0.2)"
              className="employer-directory__item"
            >
              <Typography
                variant="h5"
                component={RouterLink}
                to={`/employers/${e.slug}`}
                sx={{
                  textDecoration: 'none',
                  color: 'text.primary',
                  fontFamily: 'Anton, sans-serif',
                  letterSpacing: '-0.04em',
                  display: 'block',
                }}
                className="employer-directory__itemName"
              >
                {e.companyName}
              </Typography>
              {e.shortDescription && (
                <Typography
                  variant="subtitle1"
                  sx={{ mt: 0.5 }}
                  className="employer-directory__itemDescription"
                >
                  {e.shortDescription}
                </Typography>
              )}
              {e.ownerUid && liveJobCounts[e.ownerUid] > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  className="employer-directory__itemLiveJobs"
                >
                  {liveJobCounts[e.ownerUid]} live {liveJobCounts[e.ownerUid] === 1 ? 'job' : 'jobs'}
                </Typography>
              )}
              <Box
                mt={0.5}
                display="flex"
                flexWrap="wrap"
                gap={1}
                className="employer-directory__itemMeta"
              >
                {e.location && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className="employer-directory__itemLocation"
                  >
                    {e.location}
                    {e.postcode ? `, ${e.postcode}` : ''}
                  </Typography>
                )}
              </Box>
              {e.livingWageEmployer && (
                <Box mt={0.75}>
                  <Chip
                    label="Living Wage"
                    color="success"
                    variant="filled"
                    size="small"
                    className="employer-directory__itemLivingWageTag"
                  />
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default EmployerDirectory;
