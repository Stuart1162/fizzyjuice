import React, { useState } from 'react';
import { Container, Paper, Typography, Button, Box, List, ListItem, ListItemText, Alert } from '@mui/material';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Job } from '../types/job';

const samples: Array<Omit<Job, 'id' | 'createdAt' | 'createdBy'>> = [
  {
    title: 'Senior Frontend Engineer',
    company: 'NeonWave',
    location: 'London, UK',
    description: `## About the role\n\nWe are building the next-gen design tooling.\n\n- React 18/19, TypeScript\n- Vite, Vitest\n- GraphQL`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '£85,000 – £100,000 + equity',
    contactEmail: 'talent@neonwave.io',
    workArrangement: 'Hybrid',
    roles: ['Engineering', 'Product'],
    applicationUrl: 'https://neonwave.io/careers/frontend',
  },
  {
    title: 'Product Designer',
    company: 'FigmaFlow',
    location: 'Remote - EU timezones',
    description: `We ship fast and iterate. Bring strong UX craft and systems thinking.`,
    requirements: [],
    skills: [],
    jobType: 'Contract',
    salary: '€400 – €500/day',
    contactEmail: 'design@figmaflow.app',
    workArrangement: 'Remote',
    roles: ['Design', 'Product'],
    applicationUrl: 'https://figmaflow.app/jobs/product-designer',
  },
  {
    title: 'Head of Engineering',
    company: 'LoopLabs',
    location: 'Berlin, DE',
    description: `Lead a small, senior team. Scale infra and product.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '€130,000 – €160,000 + equity',
    contactEmail: 'careers@looplabs.dev',
    workArrangement: 'Hybrid',
    roles: ['Engineering', 'Management'],
    applicationUrl: 'https://looplabs.dev/careers/head-of-engineering',
  },
  {
    title: 'Growth Marketing Manager',
    company: 'Metricly',
    location: 'New York, USA',
    description: `Own paid + lifecycle. B2B SaaS experience preferred.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '$120,000 – $140,000 + bonus',
    contactEmail: 'jobs@metricly.com',
    workArrangement: 'Hybrid',
    roles: ['Marketing'],
    applicationUrl: 'https://metricly.com/jobs/growth-marketing',
  },
  {
    title: 'Data Analyst',
    company: 'Seedly',
    location: 'Remote - UK',
    description: `SQL, Python, dbt. Help us make better product decisions.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '£55,000 – £70,000',
    contactEmail: 'hiring@seedly.ai',
    workArrangement: 'Remote',
    roles: ['Operations'],
    applicationUrl: 'https://seedly.ai/careers/data-analyst',
  },
  {
    title: 'Customer Success Manager',
    company: 'AtlasOps',
    location: 'Austin, USA',
    description: `Work closely with customers to ensure adoption and value.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '$90,000 – $110,000 + bonus',
    contactEmail: 'careers@atlasops.co',
    workArrangement: 'Office-based',
    roles: ['Operations'],
    applicationUrl: 'https://atlasops.co/jobs/csm',
  },
  {
    title: 'Finance Manager',
    company: 'Carbonly',
    location: 'Dublin, IE',
    description: `Own reporting, FP&A, and compliance at a fast-moving startup.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '€80,000 – €95,000',
    contactEmail: 'finance@carbonly.io',
    workArrangement: 'Hybrid',
    roles: ['Finance'],
    applicationUrl: 'https://carbonly.io/careers/finance-manager',
  },
  {
    title: 'Sales Development Representative (SDR)',
    company: 'AetherCloud',
    location: 'Remote - US',
    description: `Prospect, qualify, and hand-off to AEs. SaaS experience required.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '$65,000 – $85,000 OTE',
    contactEmail: 'sales@aethercloud.dev',
    workArrangement: 'Remote',
    roles: ['Sales'],
    applicationUrl: 'https://aethercloud.dev/careers/sdr',
  },
  {
    title: 'Operations Lead',
    company: 'ParcelPro',
    location: 'Manchester, UK',
    description: `Streamline logistics and internal processes as we scale.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '£60,000 – £75,000',
    contactEmail: 'ops@parcelpro.app',
    workArrangement: 'Office-based',
    roles: ['Operations', 'Management'],
    applicationUrl: 'https://parcelpro.app/jobs/ops-lead',
  },
  {
    title: 'Associate Product Manager',
    company: 'OrbitWorks',
    location: 'San Francisco, USA',
    description: `Learn fast, own small surfaces, and work with a world-class team.`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    salary: '$100,000 – $120,000 + equity',
    contactEmail: 'pm@orbitworks.io',
    workArrangement: 'Hybrid',
    roles: ['Product'],
    applicationUrl: 'https://orbitworks.io/careers/apm',
  },
];

const SeedJobs: React.FC = () => {
  const [seeding, setSeeding] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const handleSeed = async () => {
    setSeeding(true);
    setDone(false);
    setErrors([]);
    setCreatedIds([]);

    try {
      const colRef = collection(db, 'jobs');
      const created: string[] = [];
      for (const job of samples) {
        const payload: Omit<Job, 'id'> = {
          ...job,
          createdAt: serverTimestamp(),
          createdBy: 'seed',
        } as Omit<Job, 'id'>;
        const ref = await addDoc(colRef, payload as any);
        created.push(ref.id);
      }
      setCreatedIds(created);
      setDone(true);
    } catch (e: any) {
      setErrors((prev) => [...prev, e?.message || String(e)]);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Seed Sample Jobs
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This will insert 10 example tech/startup jobs into your Firestore <code>jobs</code> collection.
        </Typography>

        {errors.length > 0 && (
          <Box mb={2}>
            {errors.map((err, idx) => (
              <Alert key={idx} severity="error" sx={{ mb: 1 }}>{err}</Alert>
            ))}
          </Box>
        )}

        {done ? (
          <Alert severity="success" sx={{ mb: 2 }}>Seeding complete.</Alert>
        ) : null}

        <Box display="flex" gap={2} mb={2}>
          <Button variant="contained" color="primary" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding…' : 'Seed 10 Jobs'}
          </Button>
        </Box>

        {createdIds.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>Created Document IDs</Typography>
            <List dense>
              {createdIds.map((id) => (
                <ListItem key={id}>
                  <ListItemText primary={id} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default SeedJobs;
