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
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import JobList from '../components/jobs/JobList';
import { Job } from '../types/job';
import '../styles/home.css';

const Home: React.FC = () => {
  const [filterText, setFilterText] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  const filters = useMemo(
    () => ({
      location: locationFilter,
      roles: selectedRoles as NonNullable<Job['roles']>,
      contractTypes: selectedContracts as Job['jobType'][],
      shifts: selectedShifts as NonNullable<Job['shifts']>,
    }),
    [locationFilter, selectedRoles, selectedContracts, selectedShifts]
  );

  return (
    <Container className="home">
      <Box className="home__hero">
        <Typography component="h1" variant="h1" className="home__title">
          Good people
          <br />
          make great food
        </Typography>

        <Typography variant="body1" className="home__subtitle">
          Let’s face it – the hospitality industry can be a toxic mess. We want to change that by
          promoting people and businesses who are responsible, talented and kind.
        </Typography>
      </Box>

      <Box className="home__layout">
        {/* Filters column */}
        <Box className="home__filters">
          {isMobile ? (
            <Accordion className="home__filtersWrapper">
              <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__filtersSummary">
                <Typography variant="h6" className="home__filtersTitle">Filters</Typography>
              </AccordionSummary>
              <AccordionDetails className="home__filtersDetails">
                {/* Search */}
                <Box className="home__search">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="Search by title, company, skills..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="home__searchInput"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: filterText && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setFilterText('')} edge="end" aria-label="clear search">
                            <ClearIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Accordion defaultExpanded className="home__filterSection home__locationFilter">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__locationSummary">
                    <Typography>Location</Typography>
                  </AccordionSummary>
                  <AccordionDetails className="home__locationDetails">
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      placeholder="e.g., London, Remote"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="home__locationInput"
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion className="home__filterSection home__roleFilter">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__roleSummary">
                    <Typography>Role</Typography>
                  </AccordionSummary>
                  <AccordionDetails className="home__roleDetails">
                    <FormGroup className="home__roleOptions">
                      {ROLE_OPTIONS.map((role) => (
                        <FormControlLabel
                          key={role}
                          control={
                            <Checkbox
                              checked={selectedRoles.includes(role)}
                              onChange={() => handleToggle(setSelectedRoles, role)}
                              className="home__roleCheckbox"
                            />
                          }
                          label={role}
                          className="home__roleOption"
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>

                <Accordion className="home__filterSection home__contractFilter">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__contractSummary">
                    <Typography>Contract Type</Typography>
                  </AccordionSummary>
                  <AccordionDetails className="home__contractDetails">
                    <FormGroup className="home__contractOptions">
                      {CONTRACT_TYPES.map((ct) => (
                        <FormControlLabel
                          key={ct}
                          control={
                            <Checkbox
                              checked={selectedContracts.includes(ct)}
                              onChange={() => handleToggle(setSelectedContracts, ct)}
                              className="home__contractCheckbox"
                            />
                          }
                          label={ct}
                          className="home__contractOption"
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>

                <Accordion className="home__filterSection home__shiftsFilter">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__shiftsSummary">
                    <Typography>Shifts</Typography>
                  </AccordionSummary>
                  <AccordionDetails className="home__shiftsDetails">
                    <FormGroup className="home__shiftsOptions">
                      {SHIFT_OPTIONS.map((shift) => (
                        <FormControlLabel
                          key={shift}
                          control={
                            <Checkbox
                              checked={selectedShifts.includes(shift)}
                              onChange={() => handleToggle(setSelectedShifts, shift)}
                              className="home__shiftCheckbox"
                            />
                          }
                          label={shift.charAt(0).toUpperCase() + shift.slice(1)}
                          className="home__shiftOption"
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              </AccordionDetails>
            </Accordion>
          ) : (
            <>
              <Typography variant="h6" className="home__filtersTitle">
                Filters
              </Typography>

              {/* Search */}
              <Box className="home__search">
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  placeholder="Search by title, company, skills..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="home__searchInput"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: filterText && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setFilterText('')} edge="end" aria-label="clear search">
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Accordion defaultExpanded className="home__filterSection home__locationFilter">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__locationSummary">
                  <Typography>Location</Typography>
                </AccordionSummary>
                <AccordionDetails className="home__locationDetails">
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="e.g., London, Remote"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="home__locationInput"
                  />
                </AccordionDetails>
              </Accordion>

              <Accordion className="home__filterSection home__roleFilter">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__roleSummary">
                  <Typography>Role</Typography>
                </AccordionSummary>
                <AccordionDetails className="home__roleDetails">
                  <FormGroup className="home__roleOptions">
                    {ROLE_OPTIONS.map((role) => (
                      <FormControlLabel
                        key={role}
                        control={
                          <Checkbox
                            checked={selectedRoles.includes(role)}
                            onChange={() => handleToggle(setSelectedRoles, role)}
                            className="home__roleCheckbox"
                          />
                        }
                        label={role}
                        className="home__roleOption"
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>

              <Accordion className="home__filterSection home__contractFilter">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__contractSummary">
                  <Typography>Contract Type</Typography>
                </AccordionSummary>
                <AccordionDetails className="home__contractDetails">
                  <FormGroup className="home__contractOptions">
                    {CONTRACT_TYPES.map((ct) => (
                      <FormControlLabel
                        key={ct}
                        control={
                          <Checkbox
                            checked={selectedContracts.includes(ct)}
                            onChange={() => handleToggle(setSelectedContracts, ct)}
                            className="home__contractCheckbox"
                          />
                        }
                        label={ct}
                        className="home__contractOption"
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>

              <Accordion className="home__filterSection home__shiftsFilter">
                <AccordionSummary expandIcon={<ExpandMoreIcon />} className="home__shiftsSummary">
                  <Typography>Shifts</Typography>
                </AccordionSummary>
                <AccordionDetails className="home__shiftsDetails">
                  <FormGroup className="home__shiftsOptions">
                    {SHIFT_OPTIONS.map((shift) => (
                      <FormControlLabel
                        key={shift}
                        control={
                          <Checkbox
                            checked={selectedShifts.includes(shift)}
                            onChange={() => handleToggle(setSelectedShifts, shift)}
                            className="home__shiftCheckbox"
                          />
                        }
                        label={shift.charAt(0).toUpperCase() + shift.slice(1)}
                        className="home__shiftOption"
                      />
                    ))}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            </>
          )}
        </Box>

        {/* Main list column */}
        <Box className="home__list">
          <JobList filterText={filterText} filters={filters} />
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
