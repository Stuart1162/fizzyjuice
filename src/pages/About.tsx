import React, { useState } from 'react';
import { Container, Typography, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import '../styles/about.css';
import SeoHead from '../components/SeoHead';

const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Fizzy Juice',
  url: 'https://www.fizzyjuice.uk',
  description: "Scotland's jobs board for ethical food and hospitality roles. Every listing pays the Real Living Wage.",
  areaServed: {
    '@type': 'State',
    name: 'Scotland',
    containedInPlace: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
  },
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Scotland',
    addressCountry: 'GB',
  },
};

const FEATURES = [
  {
    icon: <TrendingUpIcon />,
    title: 'Promoting Living Wage Employers',
    body: 'We only promote fairly paid jobs – no more race to the bottom.',
  },
  {
    icon: <FavoriteIcon />,
    title: 'More than just a job',
    body: 'Our employers are committed to providing a healthy work-life balance, and professional development.',
  },
  {
    icon: <EmojiEventsIcon />,
    title: 'Built by and for the industry',
    body: 'From chefs to front of house to KPS – the platform is for everyone looking to raise the bar in hospitality.',
  },
  {
    icon: <VerifiedUserIcon />,
    title: 'Ethical employers only',
    body: 'Venues are vetted for fair treatment and good culture.',
  },
];

const FAQS = [
  {
    q: 'What is Fizzy Juice?',
    a: 'Fizzy Juice is a jobs board for the food, drinks and hospitality industry. We only list roles from employers who are committed to ethical employment, including paying a Living Wage and treating staff fairly.',
  },
  {
    q: 'What kind of jobs are on Fizzy Juice?',
    a: 'Everything across the hospitality and food sector: chefs, kitchen porters, front of house, bar staff, baristas, hotel roles, events catering, management positions, and more. If it\'s in hospitality, pays fairly, and with a company with a good reputation, it\'s our kind of job.',
  },
  {
    q: 'How do I know an employer is ethical?',
    a: 'Every employer on Fizzy Juice is vetted before they can list. We consider wages, working conditions, rota fairness, and overall culture — and we\'re building towards a formal Fizzy Juice Employer Pledge that sets the bar even higher.',
  },
  {
    q: "I'm an employer... how do I list a job on Fizzy Juice?",
    a: 'If your business pays the Living Wage and you\'re committed to fair employment, we\'d love to have you. Create a free employer account to submit jobs and join our growing community of ethical hospitality businesses.',
  },
  {
    q: 'Is Fizzy Juice only for experienced hospitality workers?',
    a: 'Not at all. We list roles for all experience levels — from first jobs in hospitality to senior management. What connects them is that the employers behind them are committed to treating people well, whatever stage of their career they\'re at.',
  },
  {
    q: 'Why is ethical employment important in hospitality?',
    a: "Hospitality has a well-known problem with high turnover, poor pay, and difficult conditions. Fizzy Juice exists because we think that needs to change — and because there are already brilliant employers in Scotland proving it can. Fair pay, decent hours, and a good working environment aren't perks. They're the standard every hospitality worker deserves.",
  },
];

const About: React.FC = () => {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <div className="about">
      <SeoHead
        title="Fizzy Juice | Ethical Hospitality Jobs in Edinburgh, Glasgow & Scotland"
        description="Fizzy Juice is Scotland's jobs board for ethical food and hospitality roles. Every listing pays the Real Living Wage. Find fair hospitality jobs in Edinburgh, Glasgow and beyond."
        schema={ORGANIZATION_SCHEMA}
      />
      {/* Hero */}
      <Container>
        <Box className="about__hero">
          <Typography variant="h1" className="about__heroTitle">
            Discover where<br />you belong
          </Typography>
          <Typography className="about__heroSubtitle">
            Fizzy Juice is a jobs board for the food and hospitality industry, built for people who care about more than just a wage.
          </Typography>
        </Box>
      </Container>

      {/* Two-column intro */}
      <Box className="about__divider" />
      <Container>
        <Box className="about__intro">
          <Typography className="about__introCol">
            Finding a good hospitality job shouldn't mean trawling through listings that bury the pay rate and skip the stuff that matters. Fizzy Juice exists to change that. Every role on our board is from an employer that is committed to ethical employment practices — including the Living Wage, fair rotas, and good conditions.
          </Typography>
          <Typography className="about__introCol">
            With a primary focus on Scotland – Edinburgh, Glasgow, and beyond – connecting talented hospitality and food industry workers with the restaurants, bars, cafés, hotels, and catering businesses that genuinely deserve them.
          </Typography>
        </Box>
      </Container>
      <Box className="about__divider" />

      {/* Feature cards */}
      <Container>
        <Box className="about__features">
          {FEATURES.map((f) => (
            <Box key={f.title} className="about__featureCard">
              <Box className="about__featureIcon">{f.icon}</Box>
              <Typography className="about__featureTitle">{f.title}</Typography>
              <Typography className="about__featureBody">{f.body}</Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* FAQs */}
      <Box className="about__divider" />
      <Container>
        <Box className="about__faqSection">
          <Box className="about__faqLabel">
            <Typography className="about__faqHeading">FAQs</Typography>
          </Box>
          <Box className="about__faqList">
            {FAQS.map((faq, i) => (
              <Accordion
                key={i}
                expanded={expanded === `faq${i}`}
                onChange={handleChange(`faq${i}`)}
                className="about__faqAccordion"
                disableGutters
                elevation={0}
              >
                <AccordionSummary
                  expandIcon={expanded === `faq${i}` ? <RemoveIcon /> : <AddIcon />}
                  className="about__faqSummary"
                >
                  <Typography className="about__faqQuestion">{faq.q}</Typography>
                </AccordionSummary>
                <AccordionDetails className="about__faqDetails">
                  <Typography className="about__faqAnswer">{faq.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      </Container>
      <Box className="about__bottomSpacer" />
    </div>
  );
};

export default About;
