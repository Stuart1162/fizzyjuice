import React, { useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Paper,
  Button,
  Link,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import JobList from '../components/jobs/JobList';
import { Job } from '../types/job';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';

const Home: React.FC = () => {
  const [filterText, setFilterText] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const ROLE_OPTIONS: NonNullable<Job['roles']> = [
    'Engineering',
    'Design',
    'Finance',
    'Management',
    'Marketing',
    'Sales',
    'Product',
    'Operations',
    'Other',
  ];
  const CONTRACT_TYPES: Job['jobType'][] = [
    'Full-time',
    'Part-time',
    'Contract',
    'Internship',
    'Temporary',
  ];
  const REMOTE_OPTIONS: Array<NonNullable<Job['workArrangement']>> = [
    'Remote',
    'Hybrid',
    'Office-based',
  ];

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string[]>([]);

  const handleToggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const filters = useMemo(() => ({
    location: locationFilter,
    roles: selectedRoles as NonNullable<Job['roles']>,
    contractTypes: selectedContracts as Job['jobType'][],
    remoteOptions: selectedRemote as Array<NonNullable<Job['workArrangement']>>,
  }), [locationFilter, selectedRoles, selectedContracts, selectedRemote]);

  const { currentUser } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {!currentUser && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h6">Create an account to save jobs</Typography>
              <Typography variant="body2" color="text.secondary">
                Sign up to bookmark interesting roles and view them later in your dashboard.
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button variant="contained" color="primary" component={RouterLink} to="/register">
                Sign up
              </Button>
              <Button variant="outlined" component={RouterLink} to="/login">
                Log in
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
          gap: 3,
        }}
      >
        {/* Filters column */}
        <Box
          sx={{
            position: { xs: 'static', md: 'sticky' },
            top: { md: 88 },
            alignSelf: { md: 'start' },
            maxHeight: { md: 'calc(100vh - 88px)' },
            overflowY: { md: 'auto' },
            pr: { md: 1 },
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            Filters
          </Typography>
          <Divider sx={{ mb: 1 }} />

          {/* Search moved into filters sidebar */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by title, company, skills..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Location</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g., London, Remote"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Role</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {ROLE_OPTIONS.map((role) => (
                  <FormControlLabel
                    key={role}
                    control={
                      <Checkbox
                        checked={selectedRoles.includes(role)}
                        onChange={() => handleToggle(setSelectedRoles, role)}
                      />
                    }
                    label={role}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Contract Type</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {CONTRACT_TYPES.map((ct) => (
                  <FormControlLabel
                    key={ct}
                    control={
                      <Checkbox
                        checked={selectedContracts.includes(ct)}
                        onChange={() => handleToggle(setSelectedContracts, ct)}
                      />
                    }
                    label={ct}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Remote friendly</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormGroup>
                {REMOTE_OPTIONS.map((opt) => (
                  <FormControlLabel
                    key={opt}
                    control={
                      <Checkbox
                        checked={selectedRemote.includes(opt)}
                        onChange={() => handleToggle(setSelectedRemote, opt)}
                      />
                    }
                    label={opt}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Main column */}
        <Box>
          <JobList filterText={filterText} filters={filters} />
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
