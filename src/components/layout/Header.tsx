import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../contexts/SavedJobsContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Header: React.FC = () => {
  const { currentUser, signOut, isSuperAdmin } = useAuth();
  const { savedJobs } = useSavedJobs();
  const [userRole, setUserRole] = useState<'jobseeker' | 'employer' | null>(null);

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
          if (data?.role === 'jobseeker' || data?.role === 'employer') {
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
    <AppBar position="fixed">
      <Container maxWidth="lg">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Button color="inherit" component={RouterLink} to="/">
              Fizzy Juice
            </Button>
          </Typography>
          {(!currentUser || userRole !== 'jobseeker' || isSuperAdmin) && (
            <Button color="inherit" component={RouterLink} to="/post-job" sx={{ mr: 1 }}>
              Post a Job
            </Button>
          )}
          {currentUser ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Button color="inherit" component={RouterLink} to="/dashboard">
                Dashboard
              </Button>
              <Button color="inherit" component={RouterLink} to="/profile">
                {currentUser.displayName || currentUser.email}
              </Button>
            </Box>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login" sx={{ mr: 1 }}>
                Login
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Register
              </Button>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
