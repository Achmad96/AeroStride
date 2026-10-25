export interface RoutePoint {
  lat: number;
  lng: number;
  /** Epoch milliseconds. */
  timestamp: number;
  /** High-precision coordinates and altitude */
  latitude?: number;
  longitude?: number;
  altitude?: number | null;
}

/** Standard high-precision GPS coordinate object */
export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: number;
}

/** A raw GPS fix as delivered by the location provider. */
export interface Fix extends RoutePoint {
  /** Horizontal accuracy in metres (null/negative = invalid). */
  accuracy: number | null;
}

export interface RunSummary {
  startTime: number;
  endTime: number;
  durationSec: number;
  totalDistanceM: number;
  avgPaceSecPerKm: number;
  elevationGainM: number;
  pointCount: number;
}

export interface RunPayload {
  summary: RunSummary;
  coordinates: TrackPoint[];
}

export interface EndRunResult {
  success: boolean;
  payload: RunPayload;
  gpxFallback?: string;
  error?: string;
}

export type RunStatus = 'idle' | 'running' | 'paused' | 'stopped';

/** Persisted shape of a finished run. */
export interface Run {
  id: number;
  startTime: number;
  durationSec: number;
  distanceM: number;
  avgPaceSecPerKm: number;
  routePoints: RoutePoint[];
}

export type RunListItem = Omit<Run, 'routePoints'>;

/** A run that has not been saved yet (no id). */
export type RunDraft = Omit<Run, 'id'>;

export type Unit = 'km' | 'mi';

