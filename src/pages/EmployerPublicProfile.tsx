import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import { ReactComponent as ContactAddressIcon } from '../assets/icons/contact-address.svg';
import { ReactComponent as ContactEmailIcon } from '../assets/icons/contact-email.svg';
import { ReactComponent as ContactPhoneIcon } from '../assets/icons/contact-phone.svg';
import { ReactComponent as ContactInstagramIcon } from '../assets/icons/contact-instagram.svg';
import { ReactComponent as ContactWebsiteIcon } from '../assets/icons/contact-website.svg';
import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Job } from '../types/job';
import JobList from '../components/jobs/JobList';

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

const EmployerPublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<EmployerPublicProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [employerJobs, setEmployerJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState<boolean>(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

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
      const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
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
            {/* Header: company name + short description + living wage tag */}
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

              {(shortDescription || data?.livingWageEmployer) && (
                <Box
                  mt={1}
                  display="flex"
                  alignItems="center"
                  flexWrap="wrap"
                  columnGap={2}
                  rowGap={1}
                  className="public-employer-profile__subheaderRow"
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

                  {data?.livingWageEmployer && (
                    <Chip
                      label="Living Wage Employer"
                      color="success"
                      variant="outlined"
                      className="public-employer-profile__livingWageChip"
                    />
                  )}
                </Box>
              )}
            </Box>

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

