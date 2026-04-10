import groq from 'groq';
import { sanityClient } from './sanityClient';
import { CommunityCategory, CommunityPost, CommunityPostSummary } from '../types/sanity';

type FetchParams = Record<string, unknown>;

const fetchFromSanity = async <T>(query: string, params?: FetchParams): Promise<T> => {
  const client = sanityClient as unknown as {
    fetch: <Result>(q: string, p?: FetchParams) => Promise<Result>;
  };
  return client.fetch<T>(query, params);
};

const categoryProjection = `{
  _id,
  title,
  "slug": slug.current,
  themeColor,
}`;

const listProjection = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  heroImage,
  publishedAt,
  readingTime,
  tags,
  categories[]->${categoryProjection},
  featuredCategory->${categoryProjection},
  author->{
    _id,
    name,
    role,
    avatar,
  }
}`;

const detailProjection = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  heroImage,
  gallery,
  publishedAt,
  readingTime,
  tags,
  author->{
    _id,
    name,
    role,
    avatar,
    bio,
    social,
  },
  categories[]->${categoryProjection},
  featuredCategory->${categoryProjection},
  featuredFacts,
  body,
  resources,
  sidebarSections[]{
    _key,
    _type,
    heading,
    body,
    quote,
    attribution,
    ctaLabel,
    ctaUrl
  },
  seo,
  relatedPosts[]->${listProjection}
}`;

export const COMMUNITY_POSTS_QUERY = groq`*[_type == "communityPost" && defined(slug.current)]|order(publishedAt desc) ${listProjection}`;

export const COMMUNITY_POST_BY_SLUG_QUERY = groq`*[_type == "communityPost" && slug.current == $slug][0] ${detailProjection}`;

export const COMMUNITY_CATEGORIES_QUERY = groq`*[_type == "communityCategory"]|order(coalesce(order, 999) asc, title asc) ${categoryProjection}`;

export async function fetchCommunityPosts(): Promise<CommunityPostSummary[]> {
  const data = await fetchFromSanity<CommunityPostSummary[]>(COMMUNITY_POSTS_QUERY);
  return data ?? [];
}

export async function fetchCommunityPost(slug: string): Promise<CommunityPost | null> {
  if (!slug) return null;
  return fetchFromSanity<CommunityPost | null>(COMMUNITY_POST_BY_SLUG_QUERY, { slug });
}

export async function fetchCommunityCategories(): Promise<CommunityCategory[]> {
  return fetchFromSanity<CommunityCategory[]>(COMMUNITY_CATEGORIES_QUERY);
}
