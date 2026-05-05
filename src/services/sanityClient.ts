import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImage } from '../types/sanity';

const projectId = process.env.REACT_APP_SANITY_PROJECT_ID;
const dataset = process.env.REACT_APP_SANITY_DATASET;
const apiVersion = process.env.REACT_APP_SANITY_API_VERSION || '2024-03-01';

if (!projectId || !dataset) {
  // eslint-disable-next-line no-console
  console.warn('Sanity projectId/dataset are missing. Add REACT_APP_SANITY_PROJECT_ID and REACT_APP_SANITY_DATASET to .env');
} else {
  // eslint-disable-next-line no-console
  console.log('Sanity client initialized:', { projectId, dataset, apiVersion });
}

export const sanityClient = createClient({
  projectId: projectId || '',
  dataset: dataset || 'production',
  apiVersion,
  useCdn: true,
});

const builder = imageUrlBuilder(sanityClient);
export const urlFor = (source?: SanityImage | null) => (source ? builder.image(source) : builder.image({}));
