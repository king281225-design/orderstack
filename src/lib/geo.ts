/**
 * Great-circle distance between two lat/lng points, in kilometers. No
 * server dependency, no API key — used to check a customer's browser-
 * reported location against a restaurant's delivery radius (see
 * checkout-form.tsx and /dashboard/branding's delivery-zone settings).
 * Accurate enough for a delivery-radius check (Earth treated as a perfect
 * sphere) — not survey-grade, which this use case doesn't need.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
