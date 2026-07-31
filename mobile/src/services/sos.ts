/**
 * sos — native emergency effects + location for React Native.
 *
 * Vibration alarm (real, cross-platform) + keep-awake. A loud siren needs a
 * bundled audio asset played on loop via expo-av — wire that in with your own
 * siren.mp3 (see the note in startAlarm). Flashlight strobe would use
 * expo-camera's torch (add as a follow-up).
 */
import { Vibration } from "react-native";
import * as Location from "expo-location";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

const ALARM_PATTERN = [0, 600, 200, 600, 200, 1200];

export async function startAlarm(silent: boolean): Promise<void> {
  await activateKeepAwakeAsync("aiwee-sos");
  if (!silent) {
    Vibration.vibrate(ALARM_PATTERN, true);
    // TODO: play a looped siren.mp3 via expo-av Audio.Sound for audible alarm.
  }
}

export function stopAlarm(): void {
  Vibration.cancel();
  deactivateKeepAwake("aiwee-sos");
}

export async function ensureLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getCurrentPoint(): Promise<{
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
}> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
    };
  } catch {
    return { lat: 4.8156, lng: 7.0498 }; // Port Harcourt fallback
  }
}

export async function watchPosition(
  onPoint: (p: { lat: number; lng: number; accuracy?: number | null; speed?: number | null }) => void,
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
    (pos) =>
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
      }),
  );
  return () => sub.remove();
}
