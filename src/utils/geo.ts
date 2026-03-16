export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Geocode a UK postcode using the public postcodes.io API.
 * Returns latitude/longitude or throws if the postcode is invalid or not found.
 */
export async function geocodePostcode(postcode: string): Promise<LatLng> {
  const trimmed = (postcode || '').trim();
  if (!trimmed) {
    throw new Error('Postcode is empty');
  }

  const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to lookup postcode (status ${res.status})`);
  }
  const data: any = await res.json();
  if (!data || data.status !== 200 || !data.result) {
    throw new Error('Postcode not found');
  }
  const { latitude, longitude } = data.result as { latitude: number; longitude: number };
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Postcode lookup did not return coordinates');
  }
  return { lat: latitude, lng: longitude };
}
