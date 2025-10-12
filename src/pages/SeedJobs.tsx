import React, { useState } from 'react';
import { Container, Paper, Typography, Button, Box, List, ListItem, ListItemText, Alert } from '@mui/material';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Job } from '../types/job';

const samples: Array<Omit<Job, 'id' | 'createdAt' | 'createdBy'>> = [
  {
    title: 'Head Chef',
    company: 'Gourmet Bistro',
    location: 'London, UK',
    postcode: 'SW1A 1AA',
    description: `## About the role\n\nLead our kitchen team in creating exceptional dishes.\n\n- Menu planning and execution\n- Team management\n- Quality control`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£45,000 – £55,000',
    contactEmail: 'jobs@gourmetbistro.co.uk',
    roles: ['Head Chef', 'Chef'],
    shifts: ['morning', 'afternoon', 'evening'],
    wordOnTheStreet: 'Great team culture with regular social events. Management is supportive and values work-life balance.',
  },
  {
    title: 'Barista',
    company: 'Brew & Co',
    location: 'Manchester, UK',
    postcode: 'M1 1AA',
    description: `Join our team crafting perfect coffee experiences.\n\n- Espresso expertise\n- Customer service\n- Latte art skills`,
    requirements: [],
    skills: [],
    jobType: 'Part-time',
    wage: '£12 – £15/hour',
    contactEmail: 'hiring@brewco.uk',
    roles: ['Barista'],
    shifts: ['morning', 'afternoon'],
    wordOnTheStreet: 'Fun, fast-paced environment with great tips. Staff get free coffee and pastries during shifts.',
  },
  {
    title: 'Front of House Manager',
    company: 'Elegant Dining',
    location: 'Edinburgh, UK',
    postcode: 'EH1 1AA',
    description: `Oversee restaurant operations and guest experience.\n\n- Staff coordination\n- Customer relations\n- Service standards`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£35,000 – £42,000',
    contactEmail: 'careers@elegantdining.co.uk',
    roles: ['Front of House', 'Manager'],
    shifts: ['morning', 'afternoon', 'evening'],
    wordOnTheStreet: 'Professional atmosphere with strong emphasis on customer service. Regular team building events.',
  },
  {
    title: 'Kitchen Porter',
    company: 'Busy Kitchen Ltd',
    location: 'Birmingham, UK',
    postcode: 'B1 1AA',
    description: `Support our kitchen team with cleaning and prep.\n\n- Dishwashing\n- Food prep assistance\n- Maintaining hygiene`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£10.50 – £12/hour',
    contactEmail: 'jobs@busykitchen.co.uk',
    roles: ['Kitchen Porter'],
    shifts: ['morning', 'afternoon', 'evening'],
    wordOnTheStreet: 'High-pressure environment but fair management. Good for building resilience and teamwork skills.',
  },
  {
    title: 'Catering Chef',
    company: 'Event Caterers',
    location: 'Leeds, UK',
    postcode: 'LS1 1AA',
    description: `Prepare food for events and functions.\n\n- Event catering\n- Menu customization\n- On-site service`,
    requirements: [],
    skills: [],
    jobType: 'Contract',
    wage: '£25 – £35/hour',
    contactEmail: 'catering@eventcaterers.co.uk',
    roles: ['Catering', 'Chef'],
    shifts: ['afternoon', 'evening'],
    wordOnTheStreet: 'Flexible scheduling for events. Great for those who enjoy variety and meeting new people at different venues.',
  },
  {
    title: 'Breakfast Chef',
    company: 'Morning Delights',
    location: 'Brighton, UK',
    postcode: 'BN1 1AA',
    description: `Specialize in breakfast and brunch service.\n\n- Early starts\n- Fresh ingredients\n- Menu development`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£28,000 – £32,000',
    contactEmail: 'hiring@morningdelights.co.uk',
    roles: ['Breakfast Chef', 'Chef'],
    shifts: ['morning'],
    wordOnTheStreet: 'Early morning shifts but rewarding work. Staff get free breakfast and great camaraderie among early birds.',
  },
  {
    title: 'Pizza Chef',
    company: 'Authentic Pizzeria',
    location: 'Liverpool, UK',
    postcode: 'L1 1AA',
    description: `Create authentic pizzas with passion.\n\n- Dough making\n- Topping creativity\n- Oven mastery`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£26,000 – £30,000',
    contactEmail: 'jobs@authenticpizzeria.co.uk',
    roles: ['Pizza Chef', 'Chef'],
    shifts: ['afternoon', 'evening'],
    wordOnTheStreet: 'Creative and fun atmosphere. Staff can be creative with pizza toppings and enjoy team pizza nights.',
  },
  {
    title: 'Butcher',
    company: 'Premium Meats',
    location: 'Newcastle, UK',
    postcode: 'NE1 1AA',
    description: `Prepare high-quality meats for our customers.\n\n- Meat cutting\n- Product knowledge\n- Customer service`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£30,000 – £38,000',
    contactEmail: 'careers@premiummeats.co.uk',
    roles: ['Butcher'],
    shifts: ['morning', 'afternoon'],
    wordOnTheStreet: 'Traditional butchery skills valued. Good for those who enjoy working with their hands and learning from experienced butchers.',
  },
  {
    title: 'Restaurant Manager',
    company: 'Fine Dining Group',
    location: 'Oxford, UK',
    postcode: 'OX1 1AA',
    description: `Manage overall restaurant operations.\n\n- Staff leadership\n- Financial oversight\n- Customer satisfaction`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£40,000 – £50,000',
    contactEmail: 'management@finedining.co.uk',
    roles: ['Manager', 'Front of House'],
    shifts: ['morning', 'afternoon', 'evening'],
    wordOnTheStreet: 'High-end dining environment with focus on excellence. Great for career progression in hospitality management.',
  },
  {
    title: 'Baker',
    company: 'Artisan Bakery',
    location: 'Cambridge, UK',
    postcode: 'CB1 1AA',
    description: `Bake fresh breads and pastries daily.\n\n- Artisan baking\n- Early mornings\n- Quality ingredients`,
    requirements: [],
    skills: [],
    jobType: 'Full-time',
    wage: '£24,000 – £28,000',
    contactEmail: 'jobs@artisanbakery.co.uk',
    roles: ['Baker'],
    shifts: ['morning', 'afternoon'],
    wordOnTheStreet: 'Artisanal baking with high-quality ingredients. Great for bakers who love traditional methods and early starts.',
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
          This will insert 10 example hospitality jobs into your Firestore <code>jobs</code> collection.
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
