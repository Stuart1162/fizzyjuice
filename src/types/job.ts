export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  postcode?: string;
  description: string;
  requirements: string[];
  skills: string[];
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary';
  wage?: string;
  contactEmail: string;
  createdAt: any; // Firestore timestamp
  createdBy?: string; // User ID
  // Draft status - true for pending admin approval, false for approved
  draft?: boolean;
  // New fields
  roles?: Array<
    | 'Baker'
    | 'Chef'
    | 'Head Chef'
    | 'Barista'
    | 'Front of House'
    | 'Catering'
    | 'Kitchen Porter'
    | 'Butcher'
    | 'Breakfast Chef'
    | 'Pizza Chef'
    | 'Manager'
    | 'Other'
  >;
  shifts?: Array<'morning' | 'afternoon' | 'evening'>;
  applicationUrl?: string;
  // New optional field: top 3 company strengths selected at posting time
  companyStrengths?: Array<
    | 'Flexible hours'
    | 'Early finish'
    | 'Consistent rota'
    | 'No late finishes'
    | 'Paid breaks'
    | 'Actual breaks'
    | 'Living wage'
    | 'Tips shared fairly'
    | 'Staff meals'
    | 'Free parking'
    | 'Paid holidays'
    | 'Inclusive and diverse team'
    | 'LGBTQ+ Friendly'
    | 'Female run'
    | 'Friendly team'
    | 'Team socials'
    | 'Sustainable sourcing'
  >;
  // Unique 5-digit reference assigned at creation
  ref?: string;
  // Admin-only notes about the job/company culture
  wordOnTheStreet?: string;
}
