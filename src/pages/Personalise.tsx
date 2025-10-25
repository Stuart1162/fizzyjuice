import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box, FormGroup, FormControlLabel, Checkbox, Button, TextField, Divider } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useSnackbar } from 'notistack';
import { Job } from '../types/job';
import '../styles/personalise.css';

const COMPANY_STRENGTH_OPTIONS: NonNullable<Job['companyStrengths']> = [
  'Flexible hours',
  'Early finish',
  'Consistent rota',
  'No late finishes',
  'Paid breaks',
  'Actual breaks',
  'Living wage',
  'Tips shared fairly',
  'Staff meals',
  'Free parking',
  'Paid holidays',
  'Inclusive and diverse team',
  'LGBTQ+ Friendly',
  'Female run',
  'Friendly team',
  'Team socials',
  'Sustainable sourcing',
];

const WORK_ARRANGEMENTS = ['Remote', 'Hybrid', 'Office-based'] as const;
type WorkArrangementPref = typeof WORK_ARRANGEMENTS[number];

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

const CONTRACT_TYPES: Job['jobType'][] = ['Full-time', 'Part-time', 'Contract', 'Temporary'];

const Personalise: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [userStrengths, setUserStrengths] = useState<NonNullable<Job['companyStrengths']>>([] as any);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [prefWorkArrangements, setPrefWorkArrangements] = useState<WorkArrangementPref[]>([]);
  const [prefRoles, setPrefRoles] = useState<NonNullable<Job['roles']>>([] as any);
  const [prefContractTypes, setPrefContractTypes] = useState<Job['jobType'][]>([]);
  const [prefLocation, setPrefLocation] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'jobseeker');
        const snap = await getDoc(prefRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setUserStrengths((data.companyStrengths || []) as any);
          setPrefWorkArrangements((data.prefWorkArrangements || []) as any);
          setPrefRoles((data.prefRoles || []) as any);
          setPrefContractTypes((data.prefContractTypes || []) as any);
          setPrefLocation((data.prefLocation || '') as string);
        } else {
          setUserStrengths([] as any);
          setPrefWorkArrangements([]);
          setPrefRoles([] as any);
          setPrefContractTypes([]);
          setPrefLocation('');
        }
      } catch (e) {
        console.error(e);
        enqueueSnackbar('Failed to load preferences', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser, enqueueSnackbar]);

  const toggleStrength = (value: NonNullable<Job['companyStrengths']>[number]) => {
    setUserStrengths(prev => {
      const has = prev.includes(value);
      if (has) return prev.filter(v => v !== value) as any;
      if (prev.length >= 3) return prev; // limit 3
      return ([...prev, value] as any);
    });
  };

  const savePreferences = async () => {
    if (!currentUser) return;
    try {
      setSaving(true);
      const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'jobseeker');
      await setDoc(
        prefRef,
        {
          companyStrengths: userStrengths,
          prefRoles,
          prefContractTypes,
          prefLocation,
        },
        { merge: true }
      );
      enqueueSnackbar('Preferences saved', { variant: 'success' });
    } catch (e) {
      console.error(e);
      enqueueSnackbar('Failed to save preferences', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Hide page for superadmins by convention
  if (isSuperAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h6">This page is not available for superadmins.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }} className="personalise">
      <Paper variant="outlined" sx={{ p: 3 }} className="personalise__card">
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} className="personalise__header">
          <Typography variant="h5" className="personalise__title">Personalise your job list</Typography>
          <Typography variant="body2" color="text.secondary" className="personalise__counter">
            {loading ? 'Loading…' : `${userStrengths.length}/3 strengths selected`}
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }} className="personalise__sectionTitle">Top 3 company strengths</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} className="personalise__sectionHelp">
          Choose up to 3 strengths you value most. We'll highlight jobs that match.
        </Typography>
        <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0 }} className="personalise__strengths">
          {COMPANY_STRENGTH_OPTIONS.map((opt) => {
            const selected = (userStrengths || []).includes(opt);
            const disableUnchecked = !selected && (userStrengths || []).length >= 3;
            return (
              <FormControlLabel
                key={opt}
                control={<Checkbox checked={selected} onChange={() => toggleStrength(opt)} disabled={disableUnchecked} />}
                label={opt}
                className="personalise__strength"
              />
            );
          })}
        </FormGroup>
        <Typography variant="subtitle1" sx={{ mb: 1 }} className="personalise__sectionTitle">Preferred roles</Typography>
        <FormGroup row sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }} className="personalise__roles">
          {ROLE_OPTIONS.map((opt: string) => (
            <FormControlLabel
              key={opt}
              control={
                <Checkbox
                  checked={(prefRoles as any).includes(opt)}
                  onChange={() =>
                    setPrefRoles((prev: any) => (prev.includes(opt) ? prev.filter((v: any) => v !== opt) : [...prev, opt]))
                  }
                />
              }
              label={opt}
              className="personalise__role"
            />
          ))}
        </FormGroup>
        <Typography variant="subtitle1" sx={{ mb: 1 }} className="personalise__sectionTitle">Contract types</Typography>
        <FormGroup row sx={{ mb: 2 }} className="personalise__contracts">
          {CONTRACT_TYPES.map((opt) => (
            <FormControlLabel
              key={opt}
              control={
                <Checkbox
                  checked={prefContractTypes.includes(opt)}
                  onChange={() =>
                    setPrefContractTypes((prev) =>
                      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt]
                    )
                  }
                />
              }
              label={opt}
              className="personalise__contract"
            />
          ))}
        </FormGroup>
        <Typography variant="subtitle1" sx={{ mb: 1 }} className="personalise__sectionTitle">Location</Typography>
        <TextField
          fullWidth
          placeholder="e.g., London, Remote"
          value={prefLocation}
          onChange={(e) => setPrefLocation(e.target.value)}
          className="personalise__location"
        />
        <Box mt={2} display="flex" gap={1} className="personalise__actions">
          <Button variant="contained" onClick={savePreferences} disabled={saving || loading} className="personalise__save">
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Personalise;
