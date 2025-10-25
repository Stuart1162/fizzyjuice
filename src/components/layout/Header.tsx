import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSavedJobs } from '../../contexts/SavedJobsContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import '../../styles/navbar.css';
import MenuIcon from '@mui/icons-material/Menu';

const Header: React.FC = () => {
  const { currentUser, signOut, isSuperAdmin } = useAuth();
  const { savedJobs } = useSavedJobs();
  const [userRole, setUserRole] = useState<'jobseeker' | 'employer' | 'admin' | null>(null);
  const location = useLocation();
  const isPostJob = location.pathname.startsWith('/post-job');
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = () => setMobileOpen((v) => !v);

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
    <AppBar position="fixed" elevation={0} className="navbar" sx={{ backgroundColor: isPostJob ? '#FFFFFF' : undefined }}>
      <Container className="navbar__container">
        <Toolbar disableGutters className="navbar__toolbar">
          {/** Left: logo */}
          <Box component={RouterLink} to="/" className="navbar__brand">
            <Box component="img" src="/smiley.svg" alt="Fizzy Juice" className="navbar__logo" />
          </Box>

          {/** Center: tagline (only for logged-out) */}
          {!currentUser && (
            <Box className="navbar__tagline" display={{ xs: 'none', sm: 'block' }}>
              <Typography variant="body1" className="navbar__taglineText">
                A jobs board of companies that care about people as much as food
              </Typography>
            </Box>
          )}

          {/** Right: actions - desktop */}
          <Box className="navbar__actions navbar__actions--desktop">
            {currentUser ? (
              <Box display={{ xs: 'none', sm: 'flex' }} alignItems="center" gap={2}>
                {(isSuperAdmin || userRole === 'admin') && (
                  <Button color="inherit" component={RouterLink} to="/reports">Reports</Button>
                )}
                {userRole === 'employer' && (
                  <Button color="inherit" component={RouterLink} to="/post-job">Post a job</Button>
                )}
                <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
                <Button color="inherit" component={RouterLink} to="/profile">{currentUser.displayName || currentUser.email}</Button>
              </Box>
            ) : (
              <Box display={{ xs: 'none', sm: 'flex' }} alignItems="center" gap={2}>
                <Button variant="outlined" color="inherit" component={RouterLink} to="/login" className="navbar__signin">Sign in</Button>
                <Button variant="contained" color="primary" component={RouterLink} to="/post-job">Post a job</Button>
              </Box>
            )}
            {/** Mobile menu trigger as text */}
            <Box display={{ xs: 'flex', sm: 'none' }} className="navbar__actions--mobile">
              <Button color="inherit" onClick={toggleMobile} aria-label="open menu" sx={{ fontWeight: 600 }} className="navbar__menuBtn">
                MENU
              </Button>
            </Box>
          </Box>
        </Toolbar>
      </Container>
      <Drawer anchor="right" open={mobileOpen} onClose={toggleMobile} PaperProps={{ className: 'navbar__drawer' }}>
        <Box sx={{ width: 280 }} role="presentation" onClick={toggleMobile} onKeyDown={toggleMobile} className="navbar__drawerContent">
          <Box className="navbar__drawerHeader" sx={{ px: 2, py: 1.5 }}>
            <Typography variant="h6" className="navbar__drawerTitle">Fizzy Juice</Typography>
          </Box>
          <List className="navbar__drawerList">
            {currentUser ? (
              <>
                {(isSuperAdmin || userRole === 'admin') && (
                  <ListItem disablePadding>
                    <ListItemButton component={RouterLink} to="/reports" className="navbar__drawerItem">
                      <ListItemText primary="Reports" />
                    </ListItemButton>
                  </ListItem>
                )}
                {userRole === 'employer' && (
                  <ListItem disablePadding>
                    <ListItemButton component={RouterLink} to="/post-job" className="navbar__drawerItem">
                      <ListItemText primary="Post a job" />
                    </ListItemButton>
                  </ListItem>
                )}
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/dashboard" className="navbar__drawerItem">
                    <ListItemText primary="Dashboard" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/profile" className="navbar__drawerItem">
                    <ListItemText primary={currentUser.displayName || currentUser.email || 'Profile'} />
                  </ListItemButton>
                </ListItem>
              </>
            ) : (
              <>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/login" className="navbar__drawerItem">
                    <ListItemText primary="Sign in" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton component={RouterLink} to="/post-job" className="navbar__drawerItem">
                    <ListItemText primary="Post a job" />
                  </ListItemButton>
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;
