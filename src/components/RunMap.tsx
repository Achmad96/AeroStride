import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { WebView as WebViewType } from "react-native-webview";
import { useTheme, fonts } from "../theme";
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
const CARTO_KEY = process.env.EXPO_PUBLIC_CARTOCDN_API_KEY || process.env.CARTOCDN_API_KEY;
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
  var follow = false;

  function place(d) {
    if (follow) {
      var pts = line.getLatLngs();
      var pos = d.current || (pts.length ? pts[pts.length - 1] : null);
      if (!pos) return;
      me.setLatLng(pos).addTo(map);
      if (!centred) { map.setView(pos, 17); centred = true; }
      else { map.panTo(pos, { animate: false }); }
    } else {
      var all = line.getLatLngs();
      if (!all.length) return;
      startM.setLatLng(all[0]).addTo(map);
      if (all.length > 1) {
        endM.setLatLng(all[all.length - 1]).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [40, 40] });
      } else {
        map.setView(all[0], 16);
      }
    }
  }

  /** Replace the whole route. */
  window.update = function (d) {
    try { follow = !!d.follow; line.setLatLngs(d.points || []); place(d); } catch (e) {}
  };
  /** Append only new points (live mode) so the payload stays small on long runs. */
  window.append = function (d) {
    try {
      follow = !!d.follow;
      for (var i = 0; i < (d.points || []).length; i++) line.addLatLng(d.points[i]);
      place(d);
    } catch (e) {}
  };
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;
}

/** Minimum time between map updates in live mode. */
const LIVE_UPDATE_MS = 2000;

export function RunMap({ points, follow = false, current = null, style }: Props) {
  const t = useTheme();
  const ref = useRef<WebViewType>(null);
  const [ready, setReady] = useState(false);
  // Bumping this remounts the WebView after its renderer process died.
  const [instance, setInstance] = useState(0);
  const sentCount = useRef(0);
  const lastSentAt = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rebuild the page only when the theme changes.
  const html = useMemo(() => buildHtml(TILES.light, t.primary, t.card), [t.primary, t.card]);
  useEffect(() => {
    setReady(false);
    sentCount.current = 0;
  }, [html, instance]);

  // Keep the latest props in a ref so the throttled flush always sends fresh data.
  const latest = useRef({ points, current, follow });
  latest.current = { points, current, follow };

  const flush = useCallback(() => {
    pending.current = null;
    const web = ref.current;
    if (!web) return;
    try {
      const { points: pts, current: cur, follow: fol } = latest.current;
      const curArr = cur ? [cur.lat, cur.lng] : null;
      // Route was reset/shrunk (new run, different run) -> send everything.
      if (!fol || pts.length < sentCount.current || sentCount.current === 0) {
        const payload = { points: pts.map((p) => [p.lat, p.lng]), current: curArr, follow: fol };
        web.injectJavaScript(`window.update && window.update(${JSON.stringify(payload)}); true;`);
      } else {
        const fresh = pts.slice(sentCount.current).map((p) => [p.lat, p.lng]);
        const payload = { points: fresh, current: curArr, follow: fol };
        web.injectJavaScript(`window.append && window.append(${JSON.stringify(payload)}); true;`);
      }
      sentCount.current = pts.length;
      lastSentAt.current = Date.now();
    } catch (err) {
      console.warn("Map update failed:", err);
    }
  }, []);

  // Push route/position updates into the page (throttled in live mode).
  useEffect(() => {
    if (!ready) return;
    if (!follow) {
      flush();
      return;
    }
    if (pending.current) return;
    const wait = Math.max(0, LIVE_UPDATE_MS - (Date.now() - lastSentAt.current));
    pending.current = setTimeout(flush, wait);
  }, [ready, points, current, follow, flush]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    []
  );

  const recover = useCallback(() => {
    // The WebView renderer was killed (usually low memory). Without handling this,
    // Android terminates the whole app. Remount the map instead.
    if (pending.current) clearTimeout(pending.current);
    pending.current = null;
    setReady(false);
    setInstance((i) => i + 1);
  }, []);

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
        key={instance}
        ref={ref}
        source={{ html }}
        originWhitelist={["*"]}
        onMessage={(e) => e.nativeEvent.data === "ready" && setReady(true)}
        onRenderProcessGone={recover}
        onContentProcessDidTerminate={recover}
        style={[styles.web, { backgroundColor: t.card }]}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        cacheEnabled
        renderError={() => (
          <View style={[styles.error, { backgroundColor: t.card }]}>
            <Text style={{ color: t.subtext, fontFamily: fonts.medium }}>Map unavailable (no internet?)</Text>
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
