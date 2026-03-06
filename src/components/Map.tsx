/**
 * MapView — Clean, stable dark Leaflet map for AiWee
 * 
 * Fixes applied:
 *  • @keyframes injected ONCE into document head (not per-marker)
 *  • Marker pulse rings are small and contained (no map-spanning halos)
 *  • Proper icon anchor centering so markers sit on their coordinates
 *  • flyTo replaced with setView to avoid continuous animation loops
 *  • center prop deep-compared before calling setView
 *  • MapControls stable (no recreated closures causing flicker)
 */
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useIncidentStore } from '../store/useIncidentStore';
import { formatDistanceToNow } from 'date-fns';

// ── Fix Leaflet default icon path ────────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Inject keyframes ONCE into document head ─────────────────────────────────
if (typeof document !== 'undefined') {
  const STYLE_ID = 'aiwee-map-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      @keyframes aiwee-ping {
        0%   { transform: scale(1);   opacity: 0.7; }
        70%  { transform: scale(2.4); opacity: 0;   }
        100% { transform: scale(2.4); opacity: 0;   }
      }
      @keyframes aiwee-user-ping {
        0%   { transform: scale(1);   opacity: 0.6; }
        70%  { transform: scale(2.8); opacity: 0;   }
        100% { transform: scale(2.8); opacity: 0;   }
      }
      .aiwee-popup .leaflet-popup-content-wrapper {
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 14px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        padding: 0;
        overflow: hidden;
      }
      .aiwee-popup .leaflet-popup-tip-container { display: none; }
      .aiwee-popup .leaflet-popup-content { margin: 0; }
      .aiwee-popup .leaflet-popup-close-button {
        color: #475569 !important;
        font-size: 18px !important;
        top: 8px !important;
        right: 10px !important;
      }
      .leaflet-control-scale-line {
        background: rgba(15,23,42,0.85) !important;
        border-color: #334155 !important;
        color: #94a3b8 !important;
        font-size: 10px !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
      }
    `;
    document.head.appendChild(el);
  }
}

// ── Colour palette ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { primary: string; glow: string }> = {
  Accident: { primary: '#f59e0b', glow: 'rgba(245,158,11,0.5)' },
  Fire:     { primary: '#ef4444', glow: 'rgba(239,68,68,0.5)'  },
  Crime:    { primary: '#ec4899', glow: 'rgba(236,72,153,0.5)' },
  Medical:  { primary: '#10b981', glow: 'rgba(16,185,129,0.5)' },
  Flood:    { primary: '#06b6d4', glow: 'rgba(6,182,212,0.5)'  },
  Other:    { primary: '#8b5cf6', glow: 'rgba(139,92,246,0.5)' },
};

// ── Marker factory (no inline @keyframes — uses global CSS above) ─────────────
function createMarkerIcon(type: string, severity: number, isLive: boolean) {
  const { primary, glow } = TYPE_COLORS[type] ?? TYPE_COLORS.Other;
  const isUrgent = severity >= 8;
  const isMedium = severity >= 5;

  // Core dot size: BIG enough to always be visible (especially for live data)
  const core = (isUrgent || isLive) ? 18 : isMedium ? 15 : 12;

  // Container is big enough to fit the core, ring clearance, AND the live label!
  const containerWidth = 60;
  const containerHeight = 60;

  const showPulse = true; // Always show pulse for everything
  const pulseSpeed = isUrgent ? '1.0s' : isLive ? '1.3s' : '1.8s';

  // Offset to center the core perfectly in the 60x60 container
  const ringInset = `${(containerWidth - core) / 2}px`;

  const pulseDiv = showPulse
    ? `<div style="
        position:absolute;
        top:${ringInset};left:${ringInset};
        width:${core}px;height:${core}px;
        border-radius:50%;
        background:${glow};
        animation:aiwee-ping ${pulseSpeed} ease-out infinite;
      "></div>`
    : '';

  const liveLabel = isLive
    ? `<div style="
        position:absolute;
        top:0;
        left:50%;transform:translateX(-50%);
        background:rgba(16,185,129,0.95);
        color:#fff;
        font:800 8.5px/1 Inter,sans-serif;
        letter-spacing:.08em;
        padding:3px 6px;
        border-radius:4px;
        white-space:nowrap;
        pointer-events:none;
        box-shadow:0 1px 4px rgba(0,0,0,0.5);
        z-index: 10;
      ">LIVE</div>`
    : '';

  return new L.DivIcon({
    className: '',
    html: `
      <div style="position:relative;width:${containerWidth}px;height:${containerHeight}px;">
        ${pulseDiv}
        <div style="
          position:absolute;
          top:${(containerHeight - core) / 2}px;
          left:${(containerWidth - core) / 2}px;
          width:${core}px;height:${core}px;
          border-radius:50%;
          background:${primary};
          border:${isUrgent ? '2.5px' : '2.5px'} solid rgba(255,255,255,${isUrgent ? 0.95 : 0.85});
          box-shadow:0 0 ${isUrgent ? 12 : 8}px ${glow},0 2px 6px rgba(0,0,0,0.7);
          z-index: 5;
        "></div>
        ${liveLabel}
      </div>`,
    iconSize:   [containerWidth, containerHeight],
    iconAnchor: [containerWidth / 2, containerHeight / 2],
    popupAnchor:[0, -(containerHeight / 2 - 8)],
  });
}

// ── User location icon ────────────────────────────────────────────────────────
const USER_ICON = new L.DivIcon({
  className: '',
  html: `
    <div style="position:relative;width:28px;height:28px;">
      <div style="
        position:absolute;
        top:7px;left:7px;
        width:14px;height:14px;
        border-radius:50%;
        background:rgba(59,130,246,0.35);
        animation:aiwee-user-ping 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;
        top:7px;left:7px;
        width:14px;height:14px;
        border-radius:50%;
        background:#3b82f6;
        border:2.5px solid #fff;
        box-shadow:0 0 12px rgba(59,130,246,0.8),0 1px 4px rgba(0,0,0,0.5);
      "></div>
    </div>`,
  iconSize:   [28, 28],
  iconAnchor: [14, 14],
});

// ── Stable center-sync (compares values, no flyTo animation) ─────────────────
function CenterSync({ center }: { center: [number, number] }) {
  const map = useMap();
  const prev = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (
      !prev.current ||
      Math.abs(prev.current[0] - center[0]) > 0.0001 ||
      Math.abs(prev.current[1] - center[1]) > 0.0001
    ) {
      prev.current = center;
      map.setView(center, map.getZoom(), { animate: false });
    }
  }, [center, map]);
  return null;
}

// ── Scale bar ─────────────────────────────────────────────────────────────────
function ScaleBar() {
  const map = useMap();
  useEffect(() => {
    const s = L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 100 });
    s.addTo(map);
    return () => { s.remove(); };
  }, [map]);
  return null;
}

// ── Custom zoom controls ──────────────────────────────────────────────────────
function ZoomControls({ userLocation }: { userLocation?: [number, number] | null }) {
  const map = useMap();
  const btnStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    background: 'rgba(15,23,42,0.88)',
    border: '1px solid #334155',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#cbd5e1',
    fontSize: 18,
    lineHeight: 1,
    backdropFilter: 'blur(6px)',
    transition: 'background 0.12s',
  };
  return (
    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <button
        style={btnStyle}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1e293b')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.88)')}
        onClick={() => map.zoomIn()}
        title="Zoom in"
      >+</button>
      <button
        style={btnStyle}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#1e293b')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,23,42,0.88)')}
        onClick={() => map.zoomOut()}
        title="Zoom out"
      >−</button>
      {userLocation && (
        <button
          style={{ ...btnStyle, background: 'rgba(37,99,235,0.75)', borderColor: '#3b82f6', marginTop: 3, fontSize: 14 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#2563eb')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.75)')}
          onClick={() => map.setView(userLocation, 15, { animate: true })}
          title="My location"
        >⊕</button>
      )}
    </div>
  );
}

// ── Popup HTML ────────────────────────────────────────────────────────────────
function buildPopup(inc: ReturnType<typeof useIncidentStore.getState>['incidents'][0]) {
  const color = TYPE_COLORS[inc.type]?.primary ?? '#8b5cf6';
  const isLive = (inc as any).source === 'live';
  const confColor = inc.confidenceScore >= 70 ? '#10b981' : inc.confidenceScore >= 40 ? '#f59e0b' : '#ef4444';
  const text = (inc.summary || inc.description).slice(0, 130);
  const ago = formatDistanceToNow(new Date(inc.timestamp), { addSuffix: true });
  const cues = inc.cues.slice(0, 3).map((c) =>
    `<span style="display:inline-block;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.15);
      color:#94a3b8;border-radius:4px;font-size:9px;font-weight:600;padding:1px 5px;margin:1px 2px 1px 0">${c}</span>`
  ).join('');

  return `
    <div style="width:220px;padding:12px 13px;font-family:Inter,system-ui,sans-serif">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;flex-wrap:wrap">
        <span style="font:800 11px/1 Inter,sans-serif;text-transform:uppercase;letter-spacing:.07em;color:${color}">${inc.type}</span>
        ${inc.status === 'VERIFIED'
          ? '<span style="background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.3);border-radius:20px;font:700 9px/1 Inter;padding:2px 7px">✓ Verified</span>'
          : ''}
        ${isLive
          ? '<span style="background:rgba(16,185,129,.9);color:#fff;border-radius:3px;font:800 8px/1 Inter;letter-spacing:.06em;padding:2px 5px">LIVE</span>'
          : ''}
      </div>
      <p style="font-size:11.5px;color:#94a3b8;line-height:1.5;margin:0 0 8px">${text}${text.length === 130 ? '…' : ''}</p>
      <div style="margin-bottom:7px">${cues}</div>
      <div style="background:#0f172a;border-radius:3px;height:3px;overflow:hidden;margin-bottom:4px">
        <div style="height:100%;width:${inc.confidenceScore}%;background:${confColor};transition:width .5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font:600 9px/1 Inter;color:#475569">
        <span>${inc.confidenceScore}% AI confidence</span>
        <span>${ago}</span>
      </div>
    </div>`;
}

// ── Incident Markers with Zoom-on-Click ───────────────────────────────────────
function IncidentMarkers({ active }: { active: ReturnType<typeof useIncidentStore.getState>['incidents'] }) {
  const map = useMap();
  return (
    <>
      {active.map((incident) => (
        <Marker
          key={incident.id}
          position={[incident.latitude, incident.longitude]}
          icon={createMarkerIcon(
            incident.type,
            incident.severityScore,
            (incident as any).source === 'live',
          )}
          zIndexOffset={incident.severityScore * 100}
          eventHandlers={{
            click: () => {
              // Zoom in gently on click to get a clearer view
              map.setView([incident.latitude, incident.longitude], 16, { animate: true });
            }
          }}
        >
          <Popup className="aiwee-popup" maxWidth={240}>
            <div dangerouslySetInnerHTML={{ __html: buildPopup(incident) }} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}

// ── MapView Entry Point ────────────────────────────────────────────────────────────
interface MapViewProps {
  center?:       [number, number];
  zoom?:         number;
  height?:       string;
  userLocation?: [number, number] | null;
}

export default function MapView({
  center = [4.8156, 7.0498],
  zoom   = 13,
  height = '400px',
  userLocation = null,
}: MapViewProps) {
  const incidents = useIncidentStore((s) => s.incidents);
  const active = incidents.filter((i) => i.status !== 'CLOSED');

  return (
    <div style={{ height, width: '100%', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
        // ── Lock viewport to Port Harcourt ──────────────────────────────
        maxBounds={[
          [4.65, 6.82],   // south-west corner (with ~8km margin)
          [5.00, 7.25],   // north-east corner (with ~8km margin)
        ]}
        maxBoundsViscosity={1.0}   // hard border — no elastic snap-back
        minZoom={11}               // prevent zooming out to escape bounds
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <CenterSync center={center} />
        <ScaleBar />
        <ZoomControls userLocation={userLocation} />

        {/* User location */}
        {userLocation && (
          <Marker position={userLocation} icon={USER_ICON} zIndexOffset={2000}>
            <Popup className="aiwee-popup" maxWidth={200}>
              <div style={{ padding: '10px 13px', fontFamily: 'Inter,sans-serif' }}>
                <p style={{ fontWeight: 700, color: '#3b82f6', fontSize: 12, margin: '0 0 3px' }}>📍 Your Location</p>
                <p style={{ color: '#64748b', fontSize: 10, margin: 0 }}>{userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Incident markers */}
        <IncidentMarkers active={active} />
      </MapContainer>
    </div>
  );
}
