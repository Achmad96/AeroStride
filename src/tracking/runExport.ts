import { calculateElevationGain, paceSecPerKm } from './geo';
import type { EndRunResult, RoutePoint, RunPayload, TrackPoint } from '../types';

/**
 * Normalizes any RoutePoint or coordinate object into a strict TrackPoint.
 */
export function toTrackPoint(p: RoutePoint): TrackPoint {
  return {
    latitude: p.latitude ?? p.lat,
    longitude: p.longitude ?? p.lng,
    altitude: p.altitude ?? null,
    timestamp: p.timestamp,
  };
}

export interface PrepareRunOptions {
  startTime?: number;
  endTime?: number;
  durationSec?: number;
  totalDistanceM?: number;
}

/**
 * Requirement 5A: Takes the final array of coordinates and prepares a structured
 * JSON payload ready to be sent to a backend database.
 */
export function prepareRunPayload(
  points: RoutePoint[],
  options: PrepareRunOptions = {}
): RunPayload {
  const coordinates: TrackPoint[] = points.map(toTrackPoint);
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];

  const startTime = options.startTime ?? (firstPoint ? firstPoint.timestamp : Date.now());
  const endTime = options.endTime ?? (lastPoint ? lastPoint.timestamp : Date.now());
  const durationSec = options.durationSec ?? Math.max(1, Math.round((endTime - startTime) / 1000));
  const totalDistanceM = options.totalDistanceM ?? 0;
  const avgPace = paceSecPerKm(durationSec, totalDistanceM);
  const elevationGainM = calculateElevationGain(points);

  return {
    summary: {
      startTime,
      endTime,
      durationSec,
      totalDistanceM: Math.round(totalDistanceM * 10) / 10,
      avgPaceSecPerKm: Math.round(avgPace),
      elevationGainM,
      pointCount: coordinates.length,
    },
    coordinates,
  };
}

/**
 * Requirement 5B: Standard GPX 1.1 file generation fallback.
 */
export function generateGpxString(
  input: RoutePoint[] | RunPayload,
  activityName = 'AeroStride Run'
): string {
  const coordinates: TrackPoint[] = Array.isArray(input)
    ? input.map(toTrackPoint)
    : input.coordinates;

  const startTime =
    !Array.isArray(input) && input.summary
      ? input.summary.startTime
      : coordinates[0]?.timestamp ?? Date.now();

  const isoStartTime = new Date(startTime).toISOString();

  const escapeXml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const trkPointsXml = coordinates
    .map((pt) => {
      const timeIso = new Date(pt.timestamp).toISOString();
      const eleTag =
        pt.altitude !== null && Number.isFinite(pt.altitude)
          ? `\n        <ele>${pt.altitude.toFixed(1)}</ele>`
          : '';
      return `      <trkpt lat="${pt.latitude}" lon="${pt.longitude}">${eleTag}
        <time>${timeIso}</time>
      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AeroStride Running Tracker"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(activityName)}</name>
    <time>${isoStartTime}</time>
  </metadata>
  <trk>
    <name>${escapeXml(activityName)}</name>
    <type>running</type>
    <trkseg>
${trkPointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

export interface EndRunOptions extends PrepareRunOptions {
  backendUrl?: string;
  authToken?: string;
  activityName?: string;
}

/**
 * Requirement 5: Triggered when the run stops.
 * Prepares the JSON payload, attempts backend sync, and generates the GPX fallback.
 */
export async function handleEndRun(
  points: RoutePoint[],
  options: EndRunOptions = {}
): Promise<EndRunResult> {
  const payload = prepareRunPayload(points, options);
  const gpxFallback = generateGpxString(payload, options.activityName);

  if (!options.backendUrl) {
    return {
      success: true,
      payload,
      gpxFallback,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.authToken) {
      headers.Authorization = `Bearer ${options.authToken}`;
    }

    const response = await fetch(options.backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      payload,
      gpxFallback,
    };
  } catch (err: any) {
    const errorMessage = err?.name === 'AbortError' ? 'Network request timed out' : (err?.message || 'Network error');
    return {
      success: false,
      error: errorMessage,
      payload,
      gpxFallback,
    };
  }
}
