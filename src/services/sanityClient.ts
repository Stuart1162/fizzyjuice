import { createClient } from '@sanity/client';
import imageUrlBuilder, { ImageUrlBuilder } from '@sanity/image-url';
import { SanityImage } from '../types/sanity';

type SanityConfig = {
  projectId?: string;
  dataset?: string;
  apiVersion?: string;
  useCdn?: boolean;
  token?: string;
};

const config: SanityConfig = {
  projectId: process.env.REACT_APP_SANITY_PROJECT_ID,
  dataset: process.env.REACT_APP_SANITY_DATASET,
  apiVersion: process.env.REACT_APP_SANITY_API_VERSION || '2024-03-01',
  useCdn: true,
};

const hasConfig = Boolean(config.projectId && config.dataset);

if (!hasConfig) {
  // eslint-disable-next-line no-console
  console.warn('Sanity projectId/dataset are missing. Add REACT_APP_SANITY_PROJECT_ID and REACT_APP_SANITY_DATASET to .env');
}

type MinimalClient = {
  fetch: <Result>(query: string, params?: Record<string, unknown>) => Promise<Result>;
};

const fallbackClient: MinimalClient = {
  fetch: async () => {
    throw new Error('Sanity client is not configured.');
  },
};

type ConfiguredClient = ReturnType<typeof createClient>;

let configuredClient: ConfiguredClient | null = null;

if (hasConfig) {
  configuredClient = createClient({
    ...config,
    perspective: 'published',
  });
}

export const sanityClient: MinimalClient = (configuredClient ?? fallbackClient) as MinimalClient;

const builder = configuredClient ? imageUrlBuilder(configuredClient) : null;

export const urlFor = (source?: SanityImage | null): ImageUrlBuilder | null => {
  if (!source || !builder) return null;
  return builder.image(source);
};
