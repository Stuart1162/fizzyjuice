import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Job } from '../types/job';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  IconButton,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link as RouterLink } from 'react-router-dom';
import { useSavedJobs } from '../contexts/SavedJobsContext';

const Dashboard: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { savedJobs, loading: savedLoading, unsaveJob } = useSavedJobs();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => {
      const hay = `${j.title || ''} ${j.company || ''} ${j.location || ''} ${j.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, searchQuery]);

  useEffect(() => {
    const fetchMyJobs = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError(null);
      try {
        const baseRef = collection(db, 'jobs');
        const qRef = isSuperAdmin ? baseRef : query(baseRef, where('createdBy', '==', currentUser.uid));
        const snap = await getDocs(qRef);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Job[];
        setJobs(data);
      } catch (e) {
        console.error(e);
        setError('Failed to load your jobs.');
      } finally {
        setLoading(false);
      }
    };
    fetchMyJobs();
  }, [currentUser, isSuperAdmin]);

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteDoc(doc(db, 'jobs', confirmId));
      setJobs(prev => prev.filter(j => j.id !== confirmId));
      setConfirmId(null);
    } catch (e) {
      console.error(e);
      setError('Failed to delete job.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        {isSuperAdmin ? 'Admin Dashboard' : 'Your Dashboard'}
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        {isSuperAdmin ? 'Manage all job posts on the site.' : 'View your saved jobs and manage the jobs you have posted.'}
      </Typography>

      {/* Saved Jobs Section */}
      <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Saved Jobs</Typography>
          <Typography variant="body2" color="text.secondary">
            {savedLoading ? 'Loading…' : `${savedJobs.length} saved`}
          </Typography>
        </Box>
        {savedLoading ? (
          <Box display="flex" justifyContent="center" my={2}><CircularProgress size={20} /></Box>
        ) : savedJobs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            You haven't saved any jobs yet. Browse jobs on the Home page and click "Save" to bookmark them.
          </Typography>
        ) : (
          <Box display="grid" gap={1.5}>
            {savedJobs.map((s) => (
              <Box key={s.jobId} display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1">{s.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.company} • {s.location}</Typography>
                </Box>
                <Box display="flex" gap={1}>
                  <Button component={RouterLink} to={`/jobs/${s.jobId}`} variant="outlined" size="small">View</Button>
                  <Button color="error" variant="text" size="small" onClick={() => unsaveJob(s.jobId)}>Unsave</Button>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
      ) : error ? (
        <Typography color="error" mt={2}>{error}</Typography>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search jobs (title, company, location, description)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Box>
          {filteredJobs.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, mt: 1 }}>
              <Typography>
                {searchQuery.trim() ? 'No jobs match your search.' : "You haven't posted any jobs yet."}
              </Typography>
              {!searchQuery.trim() && (
                <Button variant="contained" sx={{ mt: 2 }} component={RouterLink} to="/post-job">
                  Post your first job
                </Button>
              )}
            </Paper>
          ) : (
            <Box display="grid" gap={2}>
              {filteredJobs.map(job => (
                <Paper key={job.id} variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h6">{job.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{job.company} • {job.location}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton aria-label="edit" component={RouterLink} to={`/dashboard/edit/${job.id}`}>
                        <EditIcon />
                      </IconButton>
                      <IconButton aria-label="delete" color="error" onClick={() => setConfirmId(job.id!)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {job.description.length > 160 ? job.description.slice(0, 160) + '…' : job.description}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}
        </>
      )}

      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)}>
        <DialogTitle>Delete this job?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
