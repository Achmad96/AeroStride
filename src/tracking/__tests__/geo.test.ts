import {
  haversineM,
  paceSecPerKm,
  formatDuration,
  formatPace,
  formatDistance,
  startOfWeek,
} from '../geo';

describe('haversineM', () => {
  it('is 0 for identical points', () => {
    expect(haversineM({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });
  it('one degree of latitude is ~111.2 km', () => {
    const d = haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
  it('London -> Paris is ~343 km', () => {
    const d = haversineM({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(d / 1000).toBeGreaterThan(340);
    expect(d / 1000).toBeLessThan(346);
  });
});

describe('pace and formatting', () => {
  it('computes pace', () => {
    expect(paceSecPerKm(300, 1000)).toBe(300);
    expect(paceSecPerKm(0, 1000)).toBe(0);
    expect(paceSecPerKm(300, 0)).toBe(0);
  });
  it('formats duration', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
  it('formats pace per unit', () => {
    expect(formatPace(300, 'km')).toBe('5:00');
    expect(formatPace(300, 'mi')).toBe('8:03');
    expect(formatPace(0, 'km')).toBe('--:--');
    expect(formatPace(null, 'km')).toBe('--:--');
  });
  it('formats distance per unit', () => {
    expect(formatDistance(5000, 'km')).toBe('5.00');
    expect(formatDistance(1609.344, 'mi')).toBe('1.00');
  });
  it('week starts on Monday 00:00', () => {
    const wed = new Date(2026, 9, 14, 15, 30).getTime(); // Wed 14 Oct 2026
    const start = new Date(startOfWeek(wed));
    expect(start.getDay()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(12);
  });
});

