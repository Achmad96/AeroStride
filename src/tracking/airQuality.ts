import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface AirQuality {
  aqi: number;
  mainus: string;
  level: string;
  recommendation: string;
}

export function useAirQuality() {
  const [loading, setLoading] = useState(false);
  const [aqi, setAqi] = useState<AirQuality | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchAqi() {
      const apiKey = process.env.EXPO_PUBLIC_IQAIR_API_KEY || process.env.IQAIR_API_KEY;
      if (!apiKey) {
        setError('No API key');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission denied');
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;

        const res = await fetch(`https://api.airvisual.com/v2/nearest_city?lat=${latitude}&lon=${longitude}&key=${apiKey}`);
        const data = await res.json();
        
        if (data.status !== 'success') {
          throw new Error(data.data?.message || 'API Error');
        }

        const pollution = data.data.current.pollution;
        const aqiValue = pollution.aqius;
        let level = 'Good';
        let recommendation = 'Perfect day for a run outdoors!';

        if (aqiValue > 50) { level = 'Moderate'; recommendation = 'Acceptable air quality. Good for running, but sensitive individuals should be careful.'; }
        if (aqiValue > 100) { level = 'Unhealthy for Sensitive Groups'; recommendation = 'Consider reducing prolonged or heavy exertion outdoors.'; }
        if (aqiValue > 150) { level = 'Unhealthy'; recommendation = 'Avoid intense outdoor runs. Consider treadmill training today.'; }
        if (aqiValue > 200) { level = 'Very Unhealthy'; recommendation = 'Stop outdoor activities! It is highly recommended to run indoors.'; }
        if (aqiValue > 300) { level = 'Hazardous'; recommendation = 'Health warning! Do not run outdoors under any circumstances.'; }

        if (mounted) {
          setAqi({
            aqi: aqiValue,
            mainus: pollution.mainus,
            level,
            recommendation
          });
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchAqi();
    return () => { mounted = false; };
  }, []);

  return { aqi, loading, error };
}

