import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../contexts/SavedJobsContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import '../../styles/navbar.css';

const Header: React.FC = () => {
  const { currentUser, signOut, isSuperAdmin } = useAuth();
  const { savedJobs } = useSavedJobs();
  const [userRole, setUserRole] = useState<'jobseeker' | 'employer' | 'admin' | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      if (!currentUser) {
        setUserRole(null);
        return;
      }
      try {
        const profileRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data?.role === 'jobseeker' || data?.role === 'employer' || data?.role === 'admin') {
            setUserRole(data.role);
          } else {
            setUserRole(null);
          }
        } else {
          setUserRole(null);
        }
      } catch (e) {
        setUserRole(null);
      }
    };
    loadRole();
  }, [currentUser]);

  return (
    <AppBar position="fixed" elevation={0} className="navbar">
      <Container className="navbar__container">
        <Toolbar disableGutters className="navbar__toolbar">
          {/** Left: logo */}
          <Box component={RouterLink} to="/" className="navbar__brand">
            <Box component="img" src="/smiley.svg" alt="Fizzy Juice" className="navbar__logo" />
          </Box>

          {/** Center: tagline (only for logged-out) */}
          {!currentUser && (
            <Box className="navbar__tagline">
              <Typography variant="body1" className="navbar__taglineText">
                A jobs board of companies that care about people as much as food
              </Typography>
            </Box>
          )}

          {/** Right: actions */}
          <Box className="navbar__actions">
            {currentUser ? (
              <Box display="flex" alignItems="center" gap={2}>
                {(isSuperAdmin || userRole === 'admin') && (
                  <Button color="inherit" component={RouterLink} to="/reports">
                    Reports
                  </Button>
                )}
                {userRole === 'employer' && (
                  <Button color="inherit" component={RouterLink} to="/post-job">
                    Post a job
                  </Button>
                )}
                <Button color="inherit" component={RouterLink} to="/dashboard">
                  Dashboard
                </Button>
                <Button color="inherit" component={RouterLink} to="/profile">
                  {currentUser.displayName || currentUser.email}
                </Button>
              </Box>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="inherit"
                  component={RouterLink}
                  to="/login"
                  className="navbar__signin"
                >
                  Sign in
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  component={RouterLink}
                  to="/post-job"
                >
                  Post a job
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
