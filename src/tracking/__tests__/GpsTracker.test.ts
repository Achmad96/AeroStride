import { GpsTracker } from '../GpsTracker';
import type { Fix } from '../../types';

// ~1.11 m per 0.00001 degrees of latitude
const M = 0.00001 / 1.1119;
const makeFix = (tSec: number, meters: number, accuracy: number | null = 5): Fix => ({
  lat: meters * M,
  lng: 0,
  latitude: meters * M,
  longitude: 0,
  altitude: 10 + meters * 0.01,
  timestamp: 1_000_000 + tSec * 1000,
  accuracy,
});

describe('GpsTracker', () => {
  let tracker: GpsTracker;

  beforeEach(() => {
    tracker = new GpsTracker();
    // Simulate tracker start manually without calling native expo permissions
    (tracker as any).isTracking = true;
    (tracker as any).startTime = 1_000_000;
  });

  it('Requirement 2: ignores any coordinate where accuracy is worse than 15 meters', () => {
    // Valid point: accuracy 5m
    const accepted1 = tracker.processFix(makeFix(0, 0, 5));
    expect(accepted1).toBe(true);

    // Inaccurate point: accuracy 16m (> 15m) -> REJECTED
    const rejected1 = tracker.processFix(makeFix(1, 3, 16));
    expect(rejected1).toBe(false);

    // Null accuracy -> REJECTED
    const rejected2 = tracker.processFix(makeFix(2, 6, null));
    expect(rejected2).toBe(false);

    // Borderline accurate: accuracy 14.9m (< 15m) -> ACCEPTED
    const accepted2 = tracker.processFix(makeFix(3, 9, 14.9));
    expect(accepted2).toBe(true);

    expect(tracker.getPoints()).toHaveLength(2);
  });

  it('Requirement 3: stores valid locations with latitude, longitude, altitude, and timestamp', () => {
    tracker.processFix(makeFix(0, 0, 5));
    tracker.processFix(makeFix(1, 4, 8));

    const coords = tracker.getCoordinates();
    expect(coords).toHaveLength(2);
    expect(coords[0]).toHaveProperty('latitude');
    expect(coords[0]).toHaveProperty('longitude');
    expect(coords[0]).toHaveProperty('altitude');
    expect(coords[0]).toHaveProperty('timestamp');
    expect(coords[0].latitude).toBeCloseTo(0);
    expect(coords[0].altitude).toBeCloseTo(10);
  });

  it('Requirement 4: triggers real-time polyline callback for each valid point', () => {
    const callback = jest.fn();
    tracker.onValidPoint(callback);

    tracker.processFix(makeFix(0, 0, 5));
    expect(callback).toHaveBeenCalledTimes(1);

    // Rejected fix should not trigger callback
    tracker.processFix(makeFix(1, 4, 25));
    expect(callback).toHaveBeenCalledTimes(1);

    // Valid fix should trigger callback
    tracker.processFix(makeFix(2, 6, 8));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('filters stationary jitter (< 2m step)', () => {
    tracker.processFix(makeFix(0, 0, 5));
    // Move only 0.5m -> REJECTED (jitter)
    const jitter = tracker.processFix(makeFix(1, 0.5, 5));
    expect(jitter).toBe(false);
    expect(tracker.getPoints()).toHaveLength(1);
  });

  it('filters impossible speed jumps (> 12 m/s)', () => {
    tracker.processFix(makeFix(0, 0, 5));
    // Jump 500m in 1 second (500 m/s) -> REJECTED
    const jump = tracker.processFix(makeFix(1, 500, 5));
    expect(jump).toBe(false);
    expect(tracker.getPoints()).toHaveLength(1);
  });
});

