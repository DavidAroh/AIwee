/**
 * SosSystem — app-level host for the SOS feature.
 *
 * Mounted once in the Citizen app layout so it works on every tab:
 *  • watches the safety timer and auto-fires SOS on expiry
 *  • renders the full-screen overlay whenever this device's SOS is active
 *    (including after a page reload, via the persisted emergency)
 */
import { useEffect } from "react";
import { useEmergencyStore } from "../../store/useEmergencyStore";
import { SosOverlay } from "./SosOverlay";

export function SosSystem() {
  const checkSafetyTimer = useEmergencyStore((s) => s.checkSafetyTimer);

  useEffect(() => {
    checkSafetyTimer(); // catch a timer that expired while the app was closed
    const id = setInterval(checkSafetyTimer, 1000);
    return () => clearInterval(id);
  }, [checkSafetyTimer]);

  return <SosOverlay />;
}
