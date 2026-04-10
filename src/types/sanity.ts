import { PortableTextBlock } from '@portabletext/types';

export interface CommunityCategory {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  themeColor?: string;
  order?: number;
}

export interface SanityImageAsset {
  _type: 'reference';
  _ref: string;
}

export interface SanityImageCrop {
  _type: 'sanity.imageCrop';
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SanityImageHotspot {
  _type: 'sanity.imageHotspot';
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface SanityImage {
  _type: 'image';
  asset: SanityImageAsset;
  alt?: string;
  caption?: string;
  crop?: SanityImageCrop;
  hotspot?: SanityImageHotspot;
}

export interface SanityAuthor {
  _id: string;
  name: string;
  role?: string;
  slug?: string;
  avatar?: SanityImage;
  bio?: string;
  social?: Array<{
    _key: string;
    label?: string;
    url?: string;
  }>;
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
  author?: SanityAuthor;
  sidebarSections?: SidebarSection[];
  seo?: {
    title?: string;
    description?: string;
    shareImage?: SanityImage;
  };
  relatedPosts?: CommunityPostSummary[];
}
