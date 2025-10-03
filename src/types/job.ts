export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary';
  salary?: string;
  contactEmail: string;
  createdAt: any; // Firestore timestamp
  createdBy?: string; // User ID
  // New fields
  workArrangement?: 'Remote' | 'Hybrid' | 'Office-based';
  roles?: Array<'Engineering' | 'Design' | 'Finance' | 'Management' | 'Marketing' | 'Sales' | 'Product' | 'Operations' | 'Other'>;
  applicationUrl?: string;
}
