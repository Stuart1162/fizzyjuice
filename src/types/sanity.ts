import { PortableTextBlock } from '@portabletext/types';

export interface CommunityCategory {
  _id: string;
  title: string;
  slug?: string;
  themeColor?: string;
  order?: number;
}

export interface SanityImageAsset {
  _type: 'reference';
  _ref: string;
}

export interface SanityImage {
  _type: 'image';
  asset?: SanityImageAsset;
  alt?: string;
  caption?: string;
}

export interface SanityAuthor {
  _id: string;
  name: string;
  role?: string;
  avatar?: SanityImage;
}

export interface CommunityPostFact {
  _key: string;
  label: string;
  value: string;
}

export interface CommunityResourceLink {
  _key: string;
  label: string;
  description?: string;
  url: string;
}

export interface SidebarTextSection {
  _key: string;
  _type: 'sidebarText';
  heading?: string;
  body?: PortableTextBlock[];
}

export interface SidebarQuoteSection {
  _key: string;
  _type: 'sidebarQuote';
  quote: string;
  attribution?: string;
}

export interface SidebarCtaSection {
  _key: string;
  _type: 'sidebarCta';
  heading: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export type SidebarSection = SidebarTextSection | SidebarQuoteSection | SidebarCtaSection;

export interface CommunityPostSummary {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  heroImage?: SanityImage;
  publishedAt?: string;
  readingTime?: number;
  tags?: string[];
  author?: SanityAuthor;
  categories?: CommunityCategory[];
  featuredCategory?: CommunityCategory | null;
}

export interface CommunityPost extends CommunityPostSummary {
  body: PortableTextBlock[];
  featuredFacts?: CommunityPostFact[];
  gallery?: SanityImage[];
  resources?: CommunityResourceLink[];
  sidebarSections?: SidebarSection[];
  seo?: {
    title?: string;
    description?: string;
    shareImage?: SanityImage;
  };
  relatedPosts?: CommunityPostSummary[];
}
