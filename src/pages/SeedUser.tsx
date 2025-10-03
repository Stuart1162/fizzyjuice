import React, { useState } from 'react';
import { Container, Paper, Typography, Button, Box, Alert } from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

interface Props {
  email?: string;
  password?: string;
}

const DEFAULT_EMAIL = 'stu@massive-fusion.co.uk';
const DEFAULT_PASSWORD = 'password';

const SeedUser: React.FC<Props> = () => {
  const [email] = useState<string>(DEFAULT_EMAIL);
  const [password] = useState<string>(DEFAULT_PASSWORD);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setDone(false);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setDone(true);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 6, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Seed Test User
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This will create a Firebase Auth user with the following credentials:
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2"><strong>Email:</strong> {email}</Typography>
          <Typography variant="body2"><strong>Password:</strong> {password}</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        {done && (
          <Alert severity="success" sx={{ mb: 2 }}>User created successfully.</Alert>
        )}

        <Box display="flex" gap={2}>
          <Button variant="contained" color="primary" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Creating…' : 'Create User'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SeedUser;
