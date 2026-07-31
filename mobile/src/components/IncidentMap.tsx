import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, UrlTile, type Region } from "react-native-maps";
import type { Emergency, Incident } from "../lib/types";
import { LEVEL_META } from "../lib/types";
import { theme, TYPE_COLOR } from "../theme";

const PH_REGION = {
  latitude: 4.8156,
  longitude: 7.0498,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};
const PH_BOUNDS = { minLat: 4.72, maxLat: 4.93, minLng: 6.95, maxLng: 7.17 };
const MAX_DELTA = 0.16;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TILE_URL = "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";

export default function IncidentMap({
  incidents,
  emergencies,
  onSelectIncident,
}: {
  incidents: Incident[];
  emergencies: Emergency[];
  onSelectIncident?: (i: Incident) => void;
}) {
  const active = emergencies.filter((e) => e.status === "ACTIVE" && e.track.length > 0);
  const mapRef = useRef<MapView>(null);

  // Custom marker views render blank on Android when tracksViewChanges is set
  // false before they're captured. Keep it on until markers settle, then flip
  // off for performance (re-enabled briefly whenever the set changes).
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 1500);
    return () => clearTimeout(t);
  }, [incidents.length, active.length]);

  const keepInPortHarcourt = (r: Region) => {
    const outside =
      r.latitude < PH_BOUNDS.minLat ||
      r.latitude > PH_BOUNDS.maxLat ||
      r.longitude < PH_BOUNDS.minLng ||
      r.longitude > PH_BOUNDS.maxLng ||
      r.latitudeDelta > MAX_DELTA;
    if (outside) {
      mapRef.current?.animateToRegion(
        {
          latitude: clamp(r.latitude, PH_BOUNDS.minLat, PH_BOUNDS.maxLat),
          longitude: clamp(r.longitude, PH_BOUNDS.minLng, PH_BOUNDS.maxLng),
          latitudeDelta: Math.min(r.latitudeDelta, MAX_DELTA),
          longitudeDelta: Math.min(r.longitudeDelta, MAX_DELTA),
        },
        250,
      );
    }
  };

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={PH_REGION}
      minZoomLevel={11}
      onRegionChangeComplete={keepInPortHarcourt}
      showsUserLocation
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      <UrlTile urlTemplate={TILE_URL} maximumZ={19} flipY={false} zIndex={-1} />

      {incidents.map((inc) => {
        // Web parity: bigger dots for higher severity / live items + LIVE chip
        const isLive = inc.sourceKind !== "citizen";
        const core = inc.severity >= 8 || isLive ? 18 : inc.severity >= 5 ? 15 : 12;
        return (
          <Marker
            key={inc.id}
            coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={tracks}
            onPress={() => onSelectIncident?.(inc)}
          >
            <View style={styles.markerWrap}>
              {isLive && (
                <View style={styles.liveChip}>
                  <Text style={styles.liveChipText}>LIVE</Text>
                </View>
              )}
              <View
                style={[
                  styles.dot,
                  {
                    width: core,
                    height: core,
                    borderRadius: core / 2,
                    backgroundColor: TYPE_COLOR[inc.type] ?? "#8b5cf6",
                  },
                ]}
              />
            </View>
          </Marker>
        );
      })}

      {active.map((e) => {
        const coords = e.track.map((p) => ({ latitude: p.lat, longitude: p.lng }));
        const last = coords[coords.length - 1];
        const meta = LEVEL_META[e.level];
        return (
          <View key={e.id}>
            {coords.length > 1 && (
              <Polyline
                coordinates={coords}
                strokeColor={theme.red}
                strokeWidth={3}
                lineDashPattern={[6, 6]}
              />
            )}
            <Marker
              coordinate={last}
              title={"🆘 SOS — " + meta.label}
              description="Live emergency — someone needs help"
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={999}
              tracksViewChanges={tracks}
            >
              <View style={styles.sosOuter}>
                <View style={styles.sosInner} />
              </View>
            </Marker>
          </View>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerWrap: { alignItems: "center", gap: 2 },
  liveChip: {
    backgroundColor: "rgba(37,99,235,0.95)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveChipText: { color: "#fff", fontSize: 7.5, fontWeight: "900", letterSpacing: 0.8 },
  dot: {
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  sosOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(220,38,38,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.red,
    borderWidth: 2.5,
    borderColor: "#fff",
  },
});
