import React from 'react';
import './styles/vars.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Typography } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/layout/Header';
import Home from './pages/Home';
import PostJob from './pages/PostJob';
import JobDetail from './pages/JobDetail';
import JobCategoryPage from './pages/JobCategoryPage';
import ApplyJobPage from './pages/ApplyJobPage';
import ApplySuccess from './pages/ApplySuccess';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import { SnackbarProvider } from 'notistack';
import PrivateRoute from './components/auth/PrivateRoute';
import Dashboard from './pages/Dashboard';
import EditJob from './pages/EditJob';
import JobApplicationsPage from './pages/JobApplicationsPage';
import { SavedJobsProvider } from './contexts/SavedJobsContext';
import Personalise from './pages/Personalise';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import AdminUserProfile from './pages/AdminUserProfile';
import AdminCompanyClaims from './pages/AdminCompanyClaims';
import AdminCompanyEdit from './pages/AdminCompanyEdit';
import EmployerPublicProfile from './pages/EmployerPublicProfile';
import EmployerDirectory from './pages/EmployerDirectory';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Community from './pages/Community';
import CommunityPost from './pages/CommunityPost';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF7100',
      contrastText: '#3F0000',
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
          '&.MuiButton-containedPrimary:hover': {
            backgroundColor: '#D25D00',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3F0000',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: '#3F0000',
          },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#3F0000',
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'underline',
          },
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
              <InnerAppShell />
            </Router>
          </SavedJobsProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;

const InnerAppShell: React.FC = () => {
  const location = useLocation();
  const isPostJob = location.pathname.startsWith('/post-job');
  return (
    <div className="app">
      <Header />
      <main
        className="page-main"
        style={{
          minHeight: 'calc(100vh - 64px - 56px)',
          padding: '20px 0',
          backgroundColor: isPostJob ? '#FBF9F4' : undefined,
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Slugged job detail route (preferred) with id + slug */}
          <Route path="/jobs/:id/:slug" element={<JobDetail />} />
          {/* Backwards-compatible route without slug */}
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:id/apply" element={<ApplyJobPage />} />
          <Route path="/jobs/:id/applied" element={<ApplySuccess />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/:slug" element={<CommunityPost />} />
          {/* SEO category pages for role + location combinations */}
          <Route path="/jobs/category/:slug" element={<JobCategoryPage />} />
          {/* Employer directory + public employer profile pages */}
          {/* New canonical URLs */}
          <Route path="/companies" element={<EmployerDirectory />} />
          <Route path="/companies/:slug" element={<EmployerPublicProfile />} />
          {/* Backwards-compatible old URLs */}
          <Route path="/employers" element={<EmployerDirectory />} />
          <Route path="/employers/:slug" element={<EmployerPublicProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
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
            path="/dashboard/jobs/:jobId/applications"
            element={
              <PrivateRoute>
                <JobApplicationsPage />
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
            path="/reports"
            element={
              <PrivateRoute>
                <Reports />
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
          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <AdminUsers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users/:uid/profile"
            element={
              <PrivateRoute>
                <AdminUserProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/companies/new"
            element={
              <PrivateRoute>
                <AdminCompanyEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/companies/:slug"
            element={
              <PrivateRoute>
                <AdminCompanyEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/company-claims"
            element={
              <PrivateRoute>
                <AdminCompanyClaims />
              </PrivateRoute>
            }
          />
          {/** Seed routes removed */}
        </Routes>
      </main>
      <footer
        style={{
          textAlign: 'center',
          padding: '20px',
          backgroundColor: isPostJob ? '#FFFFFF' : '#FBF9F4',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Fizzy Juice. All rights reserved. info@fizzyjuice.uk
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Platform by{' '}
          <a
            href="https://heretic-studio.co.uk/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            Heretic Studio
          </a>
          {'  •  '}
          <a
            href="/sitemap.xml"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            Sitemap
          </a>
          {'  •  '}
          <a
            href="/privacy"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            Privacy policy
          </a>
        </Typography>
      </footer>
    </div>
  );
};
