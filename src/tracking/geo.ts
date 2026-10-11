import type { RoutePoint, Unit } from '../types';

const EARTH_RADIUS_M = 6371008.8;
export const M_PER_KM = 1000;
export const M_PER_MILE = 1609.344;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two coordinates (Haversine). */
export function haversineM(
  a: Pick<RoutePoint, 'lat' | 'lng'>,
  b: Pick<RoutePoint, 'lat' | 'lng'>
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Average pace in seconds per km; 0 when there is no distance yet. */
export function paceSecPerKm(durationSec: number, distanceM: number): number {
  if (distanceM <= 0 || durationSec <= 0) return 0;
  return durationSec / (distanceM / M_PER_KM);
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function distanceInUnit(distanceM: number, unit: Unit): number {
  return distanceM / (unit === 'km' ? M_PER_KM : M_PER_MILE);
}

export function formatDistance(distanceM: number, unit: Unit): string {
  return distanceInUnit(distanceM, unit).toFixed(2);
}

/** "m:ss" per unit, or "--:--" when pace is unknown. */
export function formatPace(secPerKm: number | null, unit: Unit): string {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0) return '--:--';
  const perUnit = unit === 'km' ? secPerKm : (secPerKm * M_PER_MILE) / M_PER_KM;
  // Anything slower than 99:59 is meaningless (standing still).
  if (perUnit >= 6000) return '--:--';
  const total = Math.round(perUnit);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const distanceLabel = (unit: Unit) => (unit === 'km' ? 'km' : 'mi');
export const paceLabel = (unit: Unit) => (unit === 'km' ? 'min/km' : 'min/mi');

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Start of the current week (Monday 00:00 local) as epoch ms. */
export function startOfWeek(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d.getTime();
}
