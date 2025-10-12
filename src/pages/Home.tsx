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
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import JobList from '../components/jobs/JobList';
import { Job } from '../types/job';
import { useAuth } from '../contexts/AuthContext';
import { Link as RouterLink } from 'react-router-dom';

const Home: React.FC = () => {
  const [filterText, setFilterText] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const ROLE_OPTIONS: NonNullable<Job['roles']> = [
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
  const CONTRACT_TYPES: Job['jobType'][] = [
    'Full-time',
    'Part-time',
    'Contract',
    'Temporary',
  ];
  const SHIFT_OPTIONS: NonNullable<Job['shifts']> = [
    'morning',
    'afternoon',
    'evening',
  ];

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  const handleToggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const filters = useMemo(() => ({
    location: locationFilter,
    roles: selectedRoles as NonNullable<Job['roles']>,
    contractTypes: selectedContracts as Job['jobType'][],
    shifts: selectedShifts as NonNullable<Job['shifts']>,
  }), [locationFilter, selectedRoles, selectedContracts, selectedShifts]);

  const { currentUser } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

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
                endAdornment: filterText && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setFilterText('')}
                      edge="end"
                      aria-label="clear search"
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Location</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ maxHeight: '300px', overflowY: 'auto' }}>
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
            <AccordionDetails sx={{ maxHeight: '300px', overflowY: 'auto' }}>
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
            <AccordionDetails sx={{ maxHeight: '300px', overflowY: 'auto' }}>
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
              <Typography>Shifts</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ maxHeight: '300px', overflowY: 'auto' }}>
              <FormGroup>
                {SHIFT_OPTIONS.map((shift) => (
                  <FormControlLabel
                    key={shift}
                    control={
                      <Checkbox
                        checked={selectedShifts.includes(shift)}
                        onChange={() => handleToggle(setSelectedShifts, shift)}
                      />
                    }
                    label={shift.charAt(0).toUpperCase() + shift.slice(1)}
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
