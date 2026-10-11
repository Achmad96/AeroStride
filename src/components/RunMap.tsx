import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { WebView as WebViewType } from "react-native-webview";
import { useTheme } from "../theme";
import type { RoutePoint } from "../types";

let WebView: typeof WebViewType | null = null;
try {
  WebView = require("react-native-webview").WebView;
} catch {
  WebView = null;
}

interface Props {
  points: RoutePoint[];
  /** Live mode: show the user's position and keep it centred. */
  follow?: boolean;
  /** Latest raw GPS position (shown as the "you are here" dot in live mode). */
  current?: Pick<RoutePoint, "lat" | "lng"> | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Free map: Leaflet + CARTO basemap tiles (OpenStreetMap data).
 * No API key, no account, no Google Maps SDK required.
 */
const CARTO_KEY = process.env.EXPO_PUBLIC_CARTOCDN_API_KEY;
const KEY_PARAM = CARTO_KEY ? `?key=${CARTO_KEY}` : "";

const TILES = {
  light: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png${KEY_PARAM}`,
  dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${KEY_PARAM}`
};

function buildHtml(tileUrl: string, lineColor: string, bg: string) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:${bg};}</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([0, 0], 2);
  L.tileLayer('${tileUrl}', {
    maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);
  var line = L.polyline([], { color: '${lineColor}', weight: 6 }).addTo(map);
  var me = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#1E88E5', fillOpacity: 1 });
  var startM = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#2E7D32', fillOpacity: 1 });
  var endM = L.circleMarker([0, 0], { radius: 8, color: '#fff', weight: 3, fillColor: '#C62828', fillOpacity: 1 });
  var centred = false;

  window.update = function (d) {
    line.setLatLngs(d.points);
    if (d.follow) {
      var pos = d.current || d.points[d.points.length - 1];
      if (!pos) return;
      me.setLatLng(pos).addTo(map);
      if (!centred) { map.setView(pos, 17); centred = true; }
      else { map.panTo(pos, { animate: true }); }
    } else if (d.points.length) {
      startM.setLatLng(d.points[0]).addTo(map);
      if (d.points.length > 1) {
        endM.setLatLng(d.points[d.points.length - 1]).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [40, 40] });
      } else {
        map.setView(d.points[0], 16);
      }
    }
  };
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;
}

export function RunMap({ points, follow = false, current = null, style }: Props) {
  const t = useTheme();
  const ref = useRef<WebViewType>(null);
  const [ready, setReady] = useState(false);

  // Rebuild the page only when the theme changes.
  const html = useMemo(() => buildHtml(TILES.light, t.primary, t.card), [t.primary, t.card]);
  useEffect(() => setReady(false), [html]);

  // Push route/position updates into the page.
  useEffect(() => {
    if (!ready) return;
    const payload = {
      points: points.map((p) => [p.lat, p.lng]),
      current: current ? [current.lat, current.lng] : null,
      follow
    };
    ref.current?.injectJavaScript(`window.update && window.update(${JSON.stringify(payload)}); true;`);
  }, [ready, points, current, follow]);

  if (!WebView) {
    return (
      <View style={[styles.map, styles.center, { backgroundColor: t.card }, style]}>
        <Text style={{ color: t.subtext, textAlign: "center", padding: 16 }}>Map unavailable: rebuild the app with `npx expo run:android`.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.map, style]}>
      <WebView
        ref={ref}
        source={{ html }}
        originWhitelist={["*"]}
        onMessage={(e) => e.nativeEvent.data === "ready" && setReady(true)}
        style={[styles.web, { backgroundColor: t.card }]}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        renderError={() => (
          <View style={[styles.error, { backgroundColor: t.card }]}>
            <Text style={{ color: t.subtext }}>Map unavailable (no internet?)</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 200, overflow: "hidden" },
  web: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  error: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }
});
