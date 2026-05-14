import { Job } from '../types/job';

const LEGACY_KEYS = [
  'companyStrengths',
  'companyStrengthsLegacy',
  'strengths',
  'strengthTags',
  'companyStrengthTags',
  'companyBenefits',
  'benefits',
];

/**
 * Normalise a job's strength metadata to a trimmed array of human-friendly strings.
 * Older documents stored strengths as maps, nested objects, or boolean flags under
 * different keys; this helper coalesces all known formats so historical posts render.
 */
export function getCompanyStrengths(job?: Job | null): string[] {
  if (!job) return [];

  const seen = new Set<string>();
  const results: string[] = [];

  const push = (value?: string | null) => {
    const normalized = (value || '').trim();
    if (!normalized) return;
    const label = normalized.replace(/^./, (ch) => ch.toUpperCase());
    if (seen.has(label)) return;
    seen.add(label);
    results.push(label);
  };

  const humanizeKey = (key: string) =>
    key
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/^./, (ch) => ch.toUpperCase());

  const fromEntry = (entryKey: string, entryValue: any) => {
    if (typeof entryValue === 'string') {
      push(entryValue);
      return;
    }
    if (typeof entryValue === 'boolean') {
      if (entryValue) push(humanizeKey(entryKey));
      return;
    }
    if (Array.isArray(entryValue)) {
      entryValue.forEach((child) => fromEntry(entryKey, child));
      return;
    }
    if (entryValue && typeof entryValue === 'object') {
      if (typeof entryValue.label === 'string') {
        push(entryValue.label);
        return;
      }
      if (typeof entryValue.name === 'string') {
        push(entryValue.name);
        return;
      }
      if (typeof entryValue.value === 'string') {
        push(entryValue.value);
        return;
      }
      if (entryValue.value === true || entryValue.selected === true) {
        push(humanizeKey(entryKey));
        return;
      }
      // Some shapes store the actual label under "text" or "title"
      if (typeof entryValue.text === 'string') {
        push(entryValue.text);
        return;
      }
    }
  };

  const collectFrom = (raw: any) => {
    if (!raw) return;
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (typeof item === 'string') {
          push(item);
        } else if (item && typeof item === 'object') {
          if (typeof (item as any).label === 'string') {
            push((item as any).label);
          } else if (typeof (item as any).name === 'string') {
            push((item as any).name);
          }
        }
      });
      return;
    }
    if (typeof raw === 'string') {
      push(raw);
      return;
    }
    if (typeof raw === 'boolean') {
      if (raw) push(humanizeKey('strength'));
      return;
    }
    if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([key, value]) => {
        fromEntry(key, value);
      });
    }
  };

  LEGACY_KEYS.forEach((key) => {
    collectFrom((job as any)[key]);
  });

  return results;
}
