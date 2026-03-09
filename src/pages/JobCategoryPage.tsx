import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography } from '@mui/material';
import JobList from '../components/jobs/JobList';
import { Job } from '../types/job';

interface CategoryConfig {
  title: string;
  description: string;
  location?: string;
  role?: NonNullable<Job['roles']>[number];
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  // Example high-value categories – extend as needed
  'hospitality-jobs-edinburgh': {
    title: 'Hospitality jobs in Edinburgh',
    description: 'Browse the latest hospitality jobs in Edinburgh from independent venues on Fizzy Juice.',
    location: 'Edinburgh',
  },
  'hospitality-jobs-glasgow': {
    title: 'Hospitality jobs in Glasgow',
    description: 'Find hospitality roles in Glasgow from responsible, independent businesses.',
    location: 'Glasgow',
  },
  'chef-jobs-edinburgh': {
    title: 'Chef jobs in Edinburgh',
    description: 'Chef and kitchen roles in Edinburgh from venues that care about people and food.',
    location: 'Edinburgh',
    role: 'Chef',
  },
  'chef-jobs-glasgow': {
    title: 'Chef jobs in Glasgow',
    description: 'Chef roles in Glasgow across independent restaurants, cafes, and kitchens.',
    location: 'Glasgow',
    role: 'Chef',
  },
};

const JobCategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const key = slug || '';
  const config = CATEGORY_CONFIGS[key];

  useEffect(() => {
    if (!config) return;
    document.title = `${config.title} — Fizzy Juice`;
  }, [config]);

  const filters = useMemo(() => {
    if (!config) return undefined;
    return {
      location: config.location || '',
      roles: config.role ? [config.role] : [],
    } as any;
  }, [config]);

  if (!config) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          Category not found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This job category does not exist yet.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Box mb={3}>
        <Typography variant="h3" component="h1" gutterBottom>
          {config.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {config.description}
        </Typography>
      </Box>

      <JobList filters={filters} />
    </Container>
  );
};

export default JobCategoryPage;
