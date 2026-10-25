import * as Location from 'expo-location';
import { haversineM } from './geo';
import { MAX_ACCURACY_M, MAX_SPEED_MPS, MIN_STEP_M } from './tracker';
import type { Fix, RoutePoint, TrackPoint } from '../types';

export interface GpsTrackerOptions {
  /** Maximum accuracy radius in meters (default 15m). Discards worse fixes. */
  maxAccuracyM?: number;
  /** Minimum step distance in meters to reject stationary jitter (default 2m). */
  minStepM?: number;
  /** Maximum speed in m/s to reject teleportation spikes (default 12 m/s). */
  maxSpeedMps?: number;
  /** Location polling interval in milliseconds (default 1000ms = 1Hz). */
  timeIntervalMs?: number;
  /** Distance interval in meters for native polling (default 1m). */
  distanceIntervalM?: number;
}

/**
 * High-precision, hardware-level GPS tracking engine.
 * Implements native polling (watchPositionAsync with BestForNavigation),
 * strict 15m accuracy anti-drift filtering, speed sanity filtering,
 * and real-time polyline callback dispatch.
 */
export class GpsTracker {
  private subscription: Location.LocationSubscription | null = null;
  private isTracking = false;
  private points: RoutePoint[] = [];
  private totalDistanceM = 0;
  private startTime = 0;
  private options: Required<GpsTrackerOptions>;

  private onPointAdded?: (newPoint: RoutePoint, allPoints: RoutePoint[]) => void;
  private onFixIgnored?: (reason: string, fix: Fix) => void;

  constructor(options: GpsTrackerOptions = {}) {
    this.options = {
      maxAccuracyM: options.maxAccuracyM ?? MAX_ACCURACY_M, // 15 meters
      minStepM: options.minStepM ?? MIN_STEP_M,             // 2 meters
      maxSpeedMps: options.maxSpeedMps ?? MAX_SPEED_MPS,    // 12 m/s
      timeIntervalMs: options.timeIntervalMs ?? 1000,       // 1 second
      distanceIntervalM: options.distanceIntervalM ?? 1,     // 1 meter
    };
  }

  /**
   * Set callback triggered every time a valid, drift-filtered point is recorded.
   */
  public onValidPoint(callback: (newPoint: RoutePoint, allPoints: RoutePoint[]) => void): void {
    this.onPointAdded = callback;
  }

  /**
   * Optional debug callback when a fix is dropped by anti-drift filtering.
   */
  public onIgnoredFix(callback: (reason: string, fix: Fix) => void): void {
    this.onFixIgnored = callback;
  }

  /**
   * Request native foreground hardware location permissions.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      return fg.granted;
    } catch {
      return false;
    }
  }

  /**
   * Start high-accuracy native GNSS hardware polling.
   */
  public async start(): Promise<void> {
    if (this.isTracking) return;

    const granted = await this.requestPermissions();
    if (!granted) {
      throw new Error('Native location permission was denied.');
    }

    this.points = [];
    this.totalDistanceM = 0;
    this.startTime = Date.now();
    this.isTracking = true;

    // Requirement 1: Native location engine with highest hardware accuracy
    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: this.options.timeIntervalMs,
        distanceInterval: this.options.distanceIntervalM,
      },
      (loc: Location.LocationObject) => {
        const c = loc.coords;
        if (!c || !Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return;

        const fix: Fix = {
          lat: c.latitude,
          lng: c.longitude,
          latitude: c.latitude,
          longitude: c.longitude,
          altitude: c.altitude ?? null,
          accuracy: c.accuracy ?? null,
          timestamp: loc.timestamp || Date.now(),
        };

        this.processFix(fix);
      }
    );
  }

  /**
   * Requirement 2: Accuracy Filtering (Anti-Drift) & validation.
   */
  public processFix(fix: Fix): boolean {
    if (!this.isTracking) return false;

    // 1. Strict Accuracy Filtering: Drop any coordinate with accuracy > 15m or invalid
    if (
      fix.accuracy == null ||
      fix.accuracy < 0 ||
      fix.accuracy > this.options.maxAccuracyM
    ) {
      this.onFixIgnored?.('accuracy_too_low', fix);
      return false;
    }

    // 2. Coordinate boundary check
    if (
      !Number.isFinite(fix.lat) ||
      !Number.isFinite(fix.lng) ||
      Math.abs(fix.lat) > 90 ||
      Math.abs(fix.lng) > 180
    ) {
      this.onFixIgnored?.('invalid_coordinates', fix);
      return false;
    }

    const currentPoint: RoutePoint = {
      lat: fix.lat,
      lng: fix.lng,
      latitude: fix.latitude ?? fix.lat,
      longitude: fix.longitude ?? fix.lng,
      altitude: fix.altitude ?? null,
      timestamp: fix.timestamp,
    };

    // First valid GPS point establishes origin anchor
    if (this.points.length === 0) {
      this.points.push(currentPoint);
      this.onPointAdded?.(currentPoint, this.points);
      return true;
    }

    const lastPoint = this.points[this.points.length - 1];
    const dtSec = (currentPoint.timestamp - lastPoint.timestamp) / 1000;
    if (dtSec <= 0) {
      this.onFixIgnored?.('stale_timestamp', fix);
      return false;
    }

    const stepMeters = haversineM(lastPoint, currentPoint);

    // 3. Stationary jitter filtering: ignore movements below threshold to avoid clusters
    if (stepMeters < this.options.minStepM) {
      this.onFixIgnored?.('stationary_jitter', fix);
      return false;
    }

    // 4. Velocity sanity filtering: ignore impossible teleportation jumps
    const speedMps = stepMeters / dtSec;
    if (speedMps > this.options.maxSpeedMps) {
      this.onFixIgnored?.('speed_jump_exceeded', fix);
      return false;
    }

    // Valid point passes all filters
    this.totalDistanceM += stepMeters;
    this.points.push(currentPoint);
    this.onPointAdded?.(currentPoint, this.points);
    return true;
  }

  /**
   * Stop polling and return the final recorded coordinates.
   */
  public stop(): RoutePoint[] {
    this.isTracking = false;
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    return [...this.points];
  }

  public getPoints(): RoutePoint[] {
    return [...this.points];
  }

  public getCoordinates(): TrackPoint[] {
    return this.points.map((p) => ({
      latitude: p.latitude ?? p.lat,
      longitude: p.longitude ?? p.lng,
      altitude: p.altitude ?? null,
      timestamp: p.timestamp,
    }));
  }

  public getTotalDistanceM(): number {
    return this.totalDistanceM;
  }

  public getStartTime(): number {
    return this.startTime;
  }

  public isRunning(): boolean {
    return this.isTracking;
  }
}

