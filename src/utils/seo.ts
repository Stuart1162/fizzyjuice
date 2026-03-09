import { Job } from '../types/job';

// Build a simple, SEO-friendly slug from job title and location.
export function buildJobSlug(job: Pick<Job, 'title' | 'location'> & { id?: string }): string {
  const base = `${job.title || ''} ${job.location || ''}`.trim();
  if (!base) {
    return job.id ? `job-${job.id}` : 'job-listing';
  }
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (slug) return slug;
  return job.id ? `job-${job.id}` : 'job-listing';
}

// Build the relative path for a job detail page including slug.
export function buildJobPath(job: Job): string {
  if (!job.id) return '/';
  const slug = buildJobSlug({ id: job.id, title: job.title, location: job.location });
  return `/jobs/${job.id}/${slug}`;
}

// Build a full absolute URL for a job detail page, using window.location.origin when available.
export function buildJobUrl(job: Job, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}${buildJobPath(job)}`;
}
