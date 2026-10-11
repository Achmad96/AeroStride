export interface RoutePoint {
  lat: number;
  lng: number;
  /** Epoch milliseconds. */
  timestamp: number;
}

/** A raw GPS fix as delivered by the location provider. */
export interface Fix extends RoutePoint {
  /** Horizontal accuracy in metres (null/negative = invalid). */
  accuracy: number | null;
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

