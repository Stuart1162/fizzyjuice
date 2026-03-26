import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { db } from '../firebase';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface EmployerProfileDoc {
  companyName?: string | null;
  location?: string | null;
  postcode?: string | null;
  shortDescription?: string | null;
  about?: string | null;
  culture?: string | null;
  livingWageEmployer?: boolean | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  telephone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  ownerUid?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const AdminCompanyEdit: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();

  const [isAdminRole, setIsAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [postcode, setPostcode] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [about, setAbout] = useState('');
  const [culture, setCulture] = useState('');
  const [livingWageEmployer, setLivingWageEmployer] = useState<boolean | null>(null);
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [slugValue, setSlugValue] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditMode = !!slug;

  // Determine if current user is an admin
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!currentUser) {
        if (!cancelled) setIsAdminRole(false);
        return;
      }
      try {
        const prefRef = doc(db, 'users', currentUser.uid, 'prefs', 'profile');
        const snap = await getDoc(prefRef);
        const data = snap.exists() ? (snap.data() as any) : undefined;
        if (!cancelled) setIsAdminRole(data?.role === 'admin');
      } catch {
        if (!cancelled) setIsAdminRole(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const isAdmin = !!currentUser && (isSuperAdmin || isAdminRole);

  // Load existing company when editing
  useEffect(() => {
    const load = async () => {
      if (!isAdmin) {
        // Only show a hard error once we actually know the user is not an admin
        if (currentUser) {
          setError('You do not have permission to edit companies.');
        }
        setLoading(false);
        return;
      }

      if (!isEditMode) {
        // Creating a new company as an admin – clear any stale permission error and stop here
        setError(null);
        setLoading(false);
        return;
      }

      if (!slug) {
        setError('No company slug provided.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const ref = doc(db, 'employerProfiles', slug);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Company profile not found.');
          setLoading(false);
          return;
        }
        const data = snap.data() as EmployerProfileDoc;
        setCompanyName(data.companyName || '');
        setLocation(data.location || '');
        setPostcode(data.postcode || '');
        setShortDescription(data.shortDescription || '');
        setAbout(data.about || '');
        setCulture(data.culture || '');
        setLivingWageEmployer(
          typeof data.livingWageEmployer === 'boolean' ? data.livingWageEmployer : null
        );
        setAddressLine1(data.addressLine1 || '');
        setAddressLine2(data.addressLine2 || '');
        setTelephone(data.telephone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setInstagram(data.instagram || '');
        setOwnerUid(data.ownerUid || null);
        setCreatedAt(data.createdAt || null);
        setUpdatedAt(data.updatedAt || null);
        setSlugValue(slug);
      } catch (e: any) {
        setError(e?.message || 'Failed to load company profile.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isAdmin, isEditMode, slug, currentUser]);

  const autoSlugFromName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    return trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const name = companyName.trim();
    if (!name) {
      setError('Please enter a company name.');
      return;
    }

    let slugToUse = slugValue.trim();
    if (!slugToUse) {
      slugToUse = autoSlugFromName(name);
    }
    if (!slugToUse) {
      setError('Could not generate a valid slug from the company name.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const ref = doc(db, 'employerProfiles', slugToUse);
      const now = new Date().toISOString();

      const payload: EmployerProfileDoc = {
        companyName: name,
        location: location.trim() || null,
        postcode: postcode.trim() || null,
        shortDescription: shortDescription.trim() || null,
        about: about || null,
        culture: culture || null,
        livingWageEmployer: livingWageEmployer,
        addressLine1: addressLine1.trim() || null,
        addressLine2: addressLine2.trim() || null,
        telephone: telephone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        instagram: instagram.trim() || null,
        ownerUid: ownerUid || null,
        updatedAt: now,
      };

      if (!isEditMode) {
        payload.createdAt = now;
      }

      await setDoc(ref, payload, { merge: true });

      setUpdatedAt(now);
      setSlugValue(slugToUse);

      if (!isEditMode) {
        navigate(`/admin/companies/${slugToUse}`, { replace: true });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!isAdmin || !isEditMode || !slugValue) return;

    try {
      setDeleting(true);
      setError(null);

      const companyRef = doc(db, 'employerProfiles', slugValue);
      await deleteDoc(companyRef);

      if (ownerUid) {
        const userProfileRef = doc(db, 'users', ownerUid, 'prefs', 'profile');
        await setDoc(
          userProfileRef,
          {
            publicEmployerSlug: null,
            companyName: null,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      navigate('/companies');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete company profile.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="warning">You must be signed in to view this page.</Alert>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={2}>
          <Typography variant="h4" gutterBottom>
            {isEditMode ? 'Edit company' : 'Create company'}
          </Typography>
          {slugValue && (
            <Button
              component={RouterLink}
              to={`/companies/${slugValue}`}
              size="small"
              variant="text"
              target="_blank"
              rel="noopener noreferrer"
            >
              View public page
            </Button>
          )}
        </Box>

        {error && (
          <Box mb={2}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Company name"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              if (!isEditMode) {
                setSlugValue(autoSlugFromName(e.target.value));
              }
            }}
            required
            fullWidth
            margin="normal"
          />

          <TextField
            label="Slug (URL segment)"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            helperText="Lowercase, letters and numbers only; used in /companies/{slug}"
            fullWidth
            margin="normal"
          />

          <TextField
            label="Short description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value.slice(0, 80))}
            fullWidth
            margin="normal"
            helperText="Optional, max 80 characters"
          />

          <TextField
            label="About"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            minRows={3}
          />

          <TextField
            label="Working here / culture"
            value={culture}
            onChange={(e) => setCulture(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            minRows={3}
          />

          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} mt={2}>
            <TextField
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
            />
            <TextField
              label="Postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              fullWidth
            />
          </Box>

          <Box mt={2}>
            <TextField
              label="Address line 1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Address line 2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              fullWidth
              margin="normal"
            />
          </Box>

          <Box mt={2}>
            <TextField
              label="Telephone number"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Public contact email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              fullWidth
              margin="normal"
            />
            <TextField
              label="Website link"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              type="url"
              fullWidth
              margin="normal"
            />
            <TextField
              label="Instagram profile link"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              type="url"
              fullWidth
              margin="normal"
            />
          </Box>

          <Box mt={2}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={livingWageEmployer === true}
                  onChange={(e) => setLivingWageEmployer(e.target.checked)}
                />
              }
              label="Living Wage Employer"
            />
          </Box>

          <Box mt={2}>
            <TextField
              label="Owner UID (optional)"
              value={ownerUid || ''}
              onChange={(e) => setOwnerUid(e.target.value || null)}
              fullWidth
              margin="normal"
              helperText="If set, this account will own/manage the company profile."
            />
          </Box>

          {(createdAt || updatedAt) && (
            <Box mt={2}>
              {createdAt && (
                <Typography variant="caption" display="block">
                  Created at: {createdAt}
                </Typography>
              )}
              {updatedAt && (
                <Typography variant="caption" display="block">
                  Last updated: {updatedAt}
                </Typography>
              )}
            </Box>
          )}
          <Box mt={3} display="flex" justifyContent="space-between" gap={2}>
            {isEditMode && (
              <Button
                variant="outlined"
                color="error"
                disabled={saving || deleting}
                onClick={() => setDeleteDialogOpen(true)}
              >
                {deleting ? 'Deleting…' : 'Delete company'}
              </Button>
            )}
            <Box ml="auto">
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Create company'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
      {isEditMode && (
        <Box>
          <Box
            component={Alert}
            severity="warning"
            sx={{ mt: 2, mb: 0, display: deleteDialogOpen ? 'none' : 'block' }}
          >
            Deleting a company profile will remove it from the Companies directory. This will not
            delete any jobs, but those jobs will no longer link to a company page.
          </Box>
        </Box>
      )}
      {isEditMode && deleteDialogOpen && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <Box
            sx={{
              backgroundColor: '#fff',
              p: 3,
              borderRadius: 2,
              maxWidth: 420,
              width: '90%',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Delete company profile
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Are you sure you want to delete this company profile? This will remove it from the
              Companies directory. Jobs will not be deleted, but they will no longer link to this
              page.
            </Typography>
            <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
              <Button
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={handleDeleteCompany}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default AdminCompanyEdit;
