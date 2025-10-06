import React from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, Badge } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../contexts/SavedJobsContext';

const Header: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { savedJobs } = useSavedJobs();
  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Button color="inherit" component={RouterLink} to="/">
              GoGraft
            </Button>
          </Typography>
          <Button color="inherit" component={RouterLink} to="/post-job" sx={{ mr: 1 }}>
            Post a Job
          </Button>
          {currentUser ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Button color="inherit" component={RouterLink} to="/dashboard">
                <Badge color="secondary" badgeContent={savedJobs.length} overlap="rectangular">
                  Dashboard
                </Badge>
              </Button>
              <Typography variant="body2">Hello, {currentUser.displayName || currentUser.email}</Typography>
              <Button color="inherit" onClick={signOut}>
                Logout
              </Button>
            </Box>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login" sx={{ mr: 1 }}>
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Sign Up
              </Button>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
