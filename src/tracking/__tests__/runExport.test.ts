import { generateGpxString, handleEndRun, prepareRunPayload } from '../runExport';
import { calculateElevationGain } from '../geo';
import type { RoutePoint } from '../../types';

describe('runExport and GPX generator', () => {
  const mockPoints: RoutePoint[] = [
    {
      lat: 37.7749,
      lng: -122.4194,
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 10.5,
      timestamp: 1700000000000,
    },
    {
      lat: 37.7752,
      lng: -122.4191,
      latitude: 37.7752,
      longitude: -122.4191,
      altitude: 12.0,
      timestamp: 1700000010000,
    },
    {
      lat: 37.7755,
      lng: -122.4188,
      latitude: 37.7755,
      longitude: -122.4188,
      altitude: 15.5,
      timestamp: 1700000020000,
    },
  ];

  it('prepares a valid JSON payload for backend database', () => {
    const payload = prepareRunPayload(mockPoints, {
      startTime: 1700000000000,
      endTime: 1700000020000,
      totalDistanceM: 500,
    });

    expect(payload.summary.durationSec).toBe(20);
    expect(payload.summary.totalDistanceM).toBe(500);
    expect(payload.summary.pointCount).toBe(3);
    expect(payload.coordinates).toHaveLength(3);
    expect(payload.coordinates[0]).toEqual({
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 10.5,
      timestamp: 1700000000000,
    });
  });

  it('generates standard GPX 1.1 XML string', () => {
    const gpx = generateGpxString(mockPoints, 'Morning Run');

    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('<gpx version="1.1" creator="AeroStride Running Tracker"');
    expect(gpx).toContain('<name>Morning Run</name>');
    expect(gpx).toContain('<trkpt lat="37.7749" lon="-122.4194">');
    expect(gpx).toContain('<ele>10.5</ele>');
    expect(gpx).toContain('<ele>15.5</ele>');
    expect(gpx).toContain('</trkpt>');
    expect(gpx).toContain('</trkseg>');
    expect(gpx).toContain('</trk>');
    expect(gpx).toContain('</gpx>');
  });

  it('calculates cumulative elevation gain accurately', () => {
    const gain = calculateElevationGain(mockPoints);
    // 10.5 -> 12.0 (+1.5), 12.0 -> 15.5 (+3.5) = 5.0
    expect(gain).toBe(5);
  });

  it('handleEndRun provides payload and GPX fallback', async () => {
    const result = await handleEndRun(mockPoints, {
      startTime: 1700000000000,
      totalDistanceM: 500,
    });

    expect(result.success).toBe(true);
    expect(result.payload.summary.totalDistanceM).toBe(500);
    expect(result.gpxFallback).toContain('<gpx version="1.1"');
  });

  it('handleEndRun handles network error gracefully with fallback', async () => {
    const result = await handleEndRun(mockPoints, {
      startTime: 1700000000000,
      totalDistanceM: 500,
      backendUrl: 'http://invalid-non-existent-domain-12345.com/api/runs',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.gpxFallback).toBeDefined();
    expect(result.payload.coordinates).toHaveLength(3);
  });
});

