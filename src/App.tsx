import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Typography } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Home from './pages/Home';
import PostJob from './pages/PostJob';
import JobDetail from './pages/JobDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import { SnackbarProvider } from 'notistack';
import PrivateRoute from './components/auth/PrivateRoute';
import Dashboard from './pages/Dashboard';
import EditJob from './pages/EditJob';
import { SavedJobsProvider } from './contexts/SavedJobsContext';
import Personalise from './pages/Personalise';
import Profile from './pages/Profile';
import SeedUser from './pages/SeedUser';
import SeedJobs from './pages/SeedJobs';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#5672FF',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#FBF9F4',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3B1906',
    },
  },
  typography: {
    fontFamily: [
      'Geist',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
    h1: {
      fontFamily: ['Anton', 'Geist', 'Arial', 'sans-serif'].join(','),
      fontWeight: 600,
    },
    h2: {
      fontFamily: ['Anton', 'Geist', 'Arial', 'sans-serif'].join(','),
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
  },
  components: {
    MuiContainer: {
      defaultProps: {
        maxWidth: 'xl',
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
          '&:focus': { boxShadow: 'none' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 24px 0 rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <SavedJobsProvider>
            <Router>
              <div className="app">
              <Header />
              <main style={{ minHeight: 'calc(100vh - 64px - 56px)', padding: '20px 0' }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route
                    path="/post-job"
                    element={
                      <PrivateRoute>
                        <PostJob />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard/edit/:id"
                    element={
                      <PrivateRoute>
                        <EditJob />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard/personalise"
                    element={
                      <PrivateRoute>
                        <Personalise />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/seed-user" element={<SeedUser />} />
                  <Route path="/seed-jobs" element={<SeedJobs />} />
                </Routes>
              </main>
              <footer style={{ textAlign: 'center', padding: '20px', backgroundColor: '#FBF9F4' }}>
                <Typography variant="body2" color="text.secondary">
                  © {new Date().getFullYear()} Jobs Board. All rights reserved.
                </Typography>
              </footer>
              </div>
            </Router>
          </SavedJobsProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
