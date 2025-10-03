import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EmailIcon from '@mui/icons-material/Email';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface JobListFilters {
  location?: string;
  roles?: NonNullable<Job['roles']>;
  contractTypes?: Job['jobType'][];
  remoteOptions?: Array<NonNullable<Job['workArrangement']>>;
}

interface JobListProps {
  filterText?: string;
  filters?: JobListFilters;
}

const JobList: React.FC<JobListProps> = ({ filterText = '', filters }) => {
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
        job.workArrangement || '',
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
    const selectedRemote = f.remoteOptions || [];

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
      // Remote options
      if (selectedRemote.length > 0) {
        const wa = job.workArrangement || '';
        if (!selectedRemote.includes(wa as any)) return false;
      }
      return true;
    });
  }, [jobs, filterText, filters]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'jobs'));
        const jobsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[];
        // Sort by createdAt desc (newest first). Fallback to updatedAt if createdAt missing.
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
        jobsData.sort((a, b) => {
          const aTime = toMillis((a as any).createdAt || (a as any).updatedAt);
          const bTime = toMillis((b as any).createdAt || (b as any).updatedAt);
          return bTime - aTime;
        });
        setJobs(jobsData);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        setError('Failed to load jobs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box my={4}>
        <Typography color="error" align="center">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 3,
      }}
    >
      {filteredJobs.length === 0 ? (
        <Box my={4}>
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
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="h6">{job.title}</Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
                  <Chip icon={<BusinessIcon />} label={job.company} variant="outlined" size="small" />
                  <Chip icon={<LocationOnIcon />} label={job.location} variant="outlined" size="small" />
                  <Chip icon={<AccessTimeIcon />} label={job.jobType} variant="outlined" size="small" />
                  {job.workArrangement && (
                    <Chip icon={<AccessTimeIcon />} label={job.workArrangement} variant="outlined" size="small" />
                  )}
                  {job.salary && (
                    <Chip icon={<AttachMoneyIcon />} label={job.salary} variant="outlined" size="small" />
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    Posted: {formatCreatedAt(job.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
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

                <Box mt={2} display="flex" justifyContent="space-between">
                  <Box />
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
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};

export default JobList;
