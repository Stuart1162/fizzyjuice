import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
} from '@mui/material';
import { ReactComponent as ContactAddressIcon } from '../assets/icons/contact-address.svg';
import { ReactComponent as ContactEmailIcon } from '../assets/icons/contact-email.svg';
import { ReactComponent as ContactPhoneIcon } from '../assets/icons/contact-phone.svg';
import { ReactComponent as ContactInstagramIcon } from '../assets/icons/contact-instagram.svg';
import { ReactComponent as ContactWebsiteIcon } from '../assets/icons/contact-website.svg';
import { db } from '../firebase';
import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Job } from '../types/job';
import JobList from '../components/jobs/JobList';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

interface EmployerPublicProfileData {
  companyName?: string | null;
  location?: string | null;
  postcode?: string | null;
  shortDescription?: string | null;
  about?: string | null;
  culture?: string | null;
  benefits?: string[];
  livingWageEmployer?: boolean | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  telephone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  ownerUid?: string | null;
}

interface CompanyClaimState {
  id: string;
  status: string;
}

const EmployerPublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentUser, isSuperAdmin } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState<EmployerPublicProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [employerJobs, setEmployerJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState<boolean>(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [claim, setClaim] = useState<CompanyClaimState | null>(null);
  const [claimLoading, setClaimLoading] = useState<boolean>(false);
  const [claimSubmitting, setClaimSubmitting] = useState<boolean>(false);
  const [isAdminRole, setIsAdminRole] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const ref = doc(db, 'employerProfiles', slug);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
          setData(null);
        } else {
          setData(snap.data() as EmployerPublicProfileData);
          setNotFound(false);
        }
      } catch {
        setNotFound(true);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug]);

  // Determine if current user is an admin (from their profile prefs)
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

  // Load any existing claim by the current user for this company
  useEffect(() => {
    if (!slug || !currentUser) {
      setClaim(null);
      return;
    }

    let cancelled = false;
    const loadClaim = async () => {
      try {
        setClaimLoading(true);
        const claimsRef = collection(db, 'companyClaims');
        const q = query(
          claimsRef,
          where('companySlug', '==', slug),
          where('claimantUid', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const docData = docSnap.data() as any;
          setClaim({ id: docSnap.id, status: docData.status || 'pending' });
        } else {
          setClaim(null);
        }
      } catch {
        if (!cancelled) {
          setClaim(null);
        }
      } finally {
        if (!cancelled) setClaimLoading(false);
      }
    };

    void loadClaim();

    return () => {
      cancelled = true;
    };
  }, [slug, currentUser]);

  const toMillis = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts?.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
    try {
      return new Date(ts).getTime() || 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    const ownerUid = data?.ownerUid;
    if (!ownerUid) {
      setEmployerJobs([]);
      return;
    }

    let cancelled = false;
    const isArchived = (job: Job): boolean => {
      const created = toMillis((job as any).createdAt || (job as any).updatedAt);
      if (!created) return false;
      const TWO_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;
      return Date.now() - created > TWO_WEEKS_MS;
    };

    const loadJobs = async () => {
      try {
        setJobsLoading(true);
        setJobsError(null);
        const baseRef = collection(db, 'jobs');
        const q = query(baseRef, where('createdBy', '==', ownerUid));
        const snap = await getDocs(q);
        if (cancelled) return;
        let jobs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Job[];
        jobs = jobs.filter((j) => !j.draft && !isArchived(j));
        jobs = jobs
          .slice()
          .sort((a, b) => {
            const aMs = toMillis((a as any).createdAt || (a as any).updatedAt);
            const bMs = toMillis((b as any).createdAt || (b as any).updatedAt);
            return bMs - aMs;
          });
        setEmployerJobs(jobs);
      } catch {
        if (!cancelled) {
          setJobsError('Failed to load jobs.');
          setEmployerJobs([]);
        }
      } finally {
        if (!cancelled) {
          setJobsLoading(false);
        }
      }
    };

    void loadJobs();

    return () => {
      cancelled = true;
    };
  }, [data?.ownerUid]);

  const companyName = data?.companyName || 'Employer';
  const shortDescription = data?.shortDescription || '';
  const addressLines = [data?.addressLine1, data?.addressLine2, data?.location, data?.postcode]
    .filter((v): v is string => !!v && v.trim().length > 0);
  const benefits = Array.isArray(data?.benefits) ? data!.benefits! : [];

  const isOwned = !!data?.ownerUid;
  const isOwnedByCurrentUser =
    !!data?.ownerUid && !!currentUser && data!.ownerUid === currentUser.uid;

  const isAdmin = !!currentUser && (isSuperAdmin || isAdminRole);

  const handleSubmitClaim = async () => {
    if (!slug) return;

    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (isOwned && !isOwnedByCurrentUser) {
      enqueueSnackbar('This company profile is already managed by another account.', {
        variant: 'error',
      });
      return;
    }

    if (claim && claim.status !== 'rejected') {
      // Already have a pending or approved claim; nothing to do.
      return;
    }

    try {
      setClaimSubmitting(true);
      const claimsRef = collection(db, 'companyClaims');
      const docRef = await addDoc(claimsRef, {
        companySlug: slug,
        companyName,
        claimantUid: currentUser.uid,
        claimantEmail: currentUser.email || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setClaim({ id: docRef.id, status: 'pending' });
      enqueueSnackbar('Your claim has been submitted for review.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to submit claim. Please try again.', { variant: 'error' });
    } finally {
      setClaimSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }} className="public-employer-profile">
      <Paper elevation={0} sx={{ p: 4 }} className="public-employer-profile__card">
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="30vh">
            <CircularProgress />
          </Box>
        ) : notFound ? (
          <>
            <Typography variant="h4" component="h1" gutterBottom>
              Employer not found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              This employer profile could not be found. They may have not set up a public profile yet.
            </Typography>
          </>
        ) : (
          <>
            {/* Header: title, then sub-row with Living Wage chip + claim aligned */}
            <Box mb={4} className="public-employer-profile__header">
              <Typography
                variant="h2"
                component="h1"
                gutterBottom
                sx={{ fontFamily: 'Anton, sans-serif', fontSize: '3.5rem', letterSpacing: '-0.04em' }}
                className="public-employer-profile__companyName"
              >
                {companyName}
              </Typography>

              <Box
                mt={1}
                display={{ xs: 'block', md: 'flex' }}
                alignItems="center"
                justifyContent="space-between"
                className="public-employer-profile__subheaderRow"
              >
                <Box
                  display="flex"
                  alignItems="flex-start"
                  flexWrap="wrap"
                  columnGap={2}
                  rowGap={1}
                  mb={{ xs: 1.5, md: 0 }}
                >
                  {shortDescription && (
                    <Typography
                      variant="h5"
                      component="p"
                      sx={{ fontFamily: 'Anton, sans-serif', letterSpacing: '-0.02em' }}
                      className="public-employer-profile__shortDescription"
                    >
                      {shortDescription}
                    </Typography>
                  )}

                  <Box display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
                    {data?.livingWageEmployer && (
                      <Chip
                        label="Living Wage"
                        color="success"
                        variant="outlined"
                        className="public-employer-profile__livingWageChip"
                      />
                    )}
                    {employerJobs.length > 0 && (
                      <Typography
                        variant="body2"
                        className="public-employer-profile__liveJobsCount"
                      >
                        <span
                          className="employer-directory__liveDot"
                          aria-hidden="true"
                        />
                        {employerJobs.length === 1
                          ? '1 live job'
                          : `${employerJobs.length} live jobs`}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Right: claim / ownership callout */}
                <Box
                  textAlign={{ xs: 'left', md: 'right' }}
                  className="public-employer-profile__claim"
                >
                  {/* If owned by the current user, show a small ownership note */}
                  {isOwned && isOwnedByCurrentUser && (
                    <Typography variant="body2" color="text.secondary">
                      You manage this company profile.
                    </Typography>
                  )}

                  {/* If owned by someone else, show nothing at all */}
                  {!isOwned && (
                    claimLoading ? (
                      <Typography variant="body2" color="text.secondary">
                        Checking claim status...
                      </Typography>
                    ) : claim && claim.status === 'pending' ? (
                      <Typography variant="body2" color="text.secondary">
                        You have requested to manage this company. An admin will review your claim.
                      </Typography>
                    ) : claim && claim.status === 'rejected' ? (
                      <Typography variant="body2" color="text.secondary">
                        Your previous claim for this company was rejected. If you believe this is a mistake,
                        please contact support.
                      </Typography>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleSubmitClaim}
                        disabled={claimSubmitting}
                      >
                        Claim this company
                      </Button>
                    )
                  )}
                </Box>
              </Box>
            </Box>

            {isAdmin && slug && (
              <Box mb={3} className="public-employer-profile__adminActions">
                <Button
                  variant="text"
                  size="small"
                  component={RouterLink}
                  to={`/admin/companies/${slug}`}
                >
                  Edit company as admin
                </Button>
              </Box>
            )}

            <Box
              display={{ xs: 'block', md: 'flex' }}
              gap={4}
              className="public-employer-profile__body"
            >
              <Box
                flex={3}
                mb={{ xs: 4, md: 0 }}
                className="public-employer-profile__left"
              >
                {data?.about && (
                  <Box mb={4} className="public-employer-profile__about">
                    <Typography
                      variant="h6"
                      gutterBottom
                      className="public-employer-profile__aboutTitle"
                    >
                      About
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.primary"
                      sx={{ whiteSpace: 'pre-line' }}
                      className="public-employer-profile__aboutText"
                    >
                      {data.about}
                    </Typography>
                  </Box>
                )}

                {data?.culture && (
                  <Box mb={4} className="public-employer-profile__culture">
                    <Typography
                      variant="h6"
                      gutterBottom
                      className="public-employer-profile__cultureTitle"
                    >
                      Working here
                    </Typography>
                    <Typography
                      variant="body1"
                      color="text.primary"
                      sx={{ whiteSpace: 'pre-line' }}
                      className="public-employer-profile__cultureText"
                    >
                      {data.culture}
                    </Typography>
                  </Box>
                )}

                {benefits.length > 0 && (
                  <Box mb={4} className="public-employer-profile__benefits">
                    <Typography
                      variant="h6"
                      gutterBottom
                      className="public-employer-profile__benefitsTitle"
                    >
                      Workplace benefits
                    </Typography>
                    <Box
                      sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
                      className="public-employer-profile__benefitsList"
                    >
                      {benefits.map((b) => (
                        <Chip
                          key={b}
                          label={b}
                          color="default"
                          variant="outlined"
                          className="public-employer-profile__benefitChip"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>

              <Box flex={2} className="public-employer-profile__right">
                <Typography
                  variant="h6"
                  gutterBottom
                  className="public-employer-profile__contactTitle"
                >
                  Contact details
                </Typography>
                <List dense className="public-employer-profile__contactList">
                  {addressLines.length > 0 && (
                    <ListItem
                      disableGutters
                      className="public-employer-profile__contactItem public-employer-profile__contactAddress"
                    >
                      <ListItemIcon className="public-employer-profile__contactIcon">
                        <ContactAddressIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <>
                            {addressLines.map((line, idx) => (
                              <Box key={idx}>{line}</Box>
                            ))}
                          </>
                        }
                      />
                    </ListItem>
                  )}
                  {data?.email && (
                    <ListItem
                      disableGutters
                      className="public-employer-profile__contactItem public-employer-profile__contactEmail"
                    >
                      <ListItemIcon className="public-employer-profile__contactIcon">
                        <ContactEmailIcon />
                      </ListItemIcon>
                      <ListItemText primary={data.email} />
                    </ListItem>
                  )}
                  {data?.telephone && (
                    <ListItem
                      disableGutters
                      className="public-employer-profile__contactItem public-employer-profile__contactTelephone"
                    >
                      <ListItemIcon className="public-employer-profile__contactIcon">
                        <ContactPhoneIcon />
                      </ListItemIcon>
                      <ListItemText primary={data.telephone} />
                    </ListItem>
                  )}
                  {data?.instagram && (
                    <ListItem
                      disableGutters
                      className="public-employer-profile__contactItem public-employer-profile__contactInstagram"
                    >
                      <ListItemIcon className="public-employer-profile__contactIcon">
                        <ContactInstagramIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <a
                            href={data.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="public-employer-profile__contactLink"
                          >
                            Instagram
                          </a>
                        }
                      />
                    </ListItem>
                  )}
                  {data?.website && (
                    <ListItem
                      disableGutters
                      className="public-employer-profile__contactItem public-employer-profile__contactWebsite"
                    >
                      <ListItemIcon className="public-employer-profile__contactIcon">
                        <ContactWebsiteIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <a
                            href={data.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="public-employer-profile__contactLink"
                          >
                            Visit website
                          </a>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Box>
          </>
        )}
      </Paper>

      {!loading && !notFound && (
        <Box mt={4} mb={6} className="public-employer-profile__jobs">
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            className="public-employer-profile__jobsTitle"
          >
            Jobs at {companyName}
          </Typography>

          {jobsLoading ? (
            <Box display="flex" justifyContent="center" mt={2}>
              <CircularProgress size={24} />
            </Box>
          ) : jobsError ? (
            <Typography variant="body2" color="text.secondary">
              {jobsError}
            </Typography>
          ) : employerJobs.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No live jobs right now.
            </Typography>
          ) : (
            <Box mt={2} className="public-employer-profile__jobsList">
              <JobList jobsOverride={employerJobs} />
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default EmployerPublicProfile;

