import { create } from 'zustand';

export type IncidentStatus = 'UNVERIFIED' | 'VERIFIED' | 'CLOSED';
export type IncidentType = 'Accident' | 'Fire' | 'Crime' | 'Medical' | 'Flood' | 'Other';

export interface Incident {
  id: string;
  type: IncidentType;
  description: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: IncidentStatus;
  severityScore: number;
  confidenceScore: number;
  summary: string;
  cues: string[];
  corroboratingEvidence?: string[];
  nearbyPlaces?: string[];
  mediaUrl?: string;
  reportersCount: number;
  source?: 'citizen' | 'live';
  statusHistory?: { status: IncidentStatus; timestamp: string; note?: string }[];
}

export interface Alert {
  id: string;
  incidentId: string;
  type: 'VERIFICATION' | 'INFORMATIONAL' | 'CAUTIONARY' | 'URGENT';
  message: string;
  timestamp: string;
  radiusKm: number;
  read?: boolean;
}

// ── Session tracking (persisted to localStorage) ──────────────────────────────
const SESSION_KEY = 'aiwee_session';
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveSession(data: { id: string; reports: number; verifications: number; dismissedAlerts: string[] }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}
const stored = loadSession();
const SESSION_ID = stored?.id ?? `AW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
if (!stored) saveSession({ id: SESSION_ID, reports: 0, verifications: 0, dismissedAlerts: [] });

const VERIFY_THRESHOLD = 3; // reporters needed to auto-verify

interface IncidentStore {
  incidents: Incident[];
  alerts: Alert[];
  // Session
  sessionId: string;
  sessionReports: number;
  sessionVerifications: number;
  dismissedAlerts: string[];
  // Actions
  addIncident: (incident: Omit<Incident, 'id' | 'timestamp' | 'status' | 'reportersCount'> & { _id?: string }) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  confirmIncident: (incidentId: string, confirmed: boolean) => void;
  verifyIncident: (id: string) => void;
  closeIncident: (id: string) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  dismissAlert: (id: string) => void;
  markAlertRead: (id: string) => void;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const initialIncidents: Incident[] = [
  {
    id: 'inc-1',
    type: 'Medical',
    description: 'Medical emergency at Diobu Area.',
    latitude: 4.795, longitude: 6.990,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'UNVERIFIED',
    severityScore: 8,
    confidenceScore: 67,
    summary: 'Medical emergency reported in Diobu Area. Ambulance needed immediately.',
    cues: ['Diobu Area', 'ambulance needed', 'urgent'],
    reportersCount: 2,
    source: 'citizen',
    statusHistory: [{ status: 'UNVERIFIED', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), note: 'First report' }],
  },
  {
    id: 'inc-2',
    type: 'Fire',
    description: 'Fire outbreak at Diobu Market.',
    latitude: 4.790, longitude: 6.985,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'VERIFIED',
    severityScore: 9,
    confidenceScore: 87,
    summary: 'Major fire outbreak at Diobu Market. Multiple stalls affected, fire service responding.',
    cues: ['Diobu Market', 'smoke', 'flames', 'market stalls'],
    reportersCount: 12,
    source: 'citizen',
    statusHistory: [
      { status: 'UNVERIFIED', timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(), note: 'First report' },
      { status: 'VERIFIED', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), note: 'Crowd threshold reached (12 reports)' },
    ],
  },
  {
    id: 'inc-3',
    type: 'Flood',
    description: 'Severe flooding at Rumuigbo junction.',
    latitude: 4.830, longitude: 6.990,
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    status: 'VERIFIED',
    severityScore: 7,
    confidenceScore: 95,
    summary: 'Flooding consistent with recent rainfall. 8 unique device reports in 500m radius within 15 min. Road impassable.',
    cues: ['Rumuigbo Junction', 'water level rising', 'impassable road', 'drainage blocked'],
    reportersCount: 8,
    source: 'citizen',
    statusHistory: [
      { status: 'UNVERIFIED', timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(), note: 'First report' },
      { status: 'VERIFIED', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), note: 'AI confidence high + crowd threshold' },
    ],
  },
];

const initialAlerts: Alert[] = [
  {
    id: 'alt-seed-1',
    incidentId: 'inc-2',
    type: 'URGENT',
    message: '🔥 Major fire verified at Diobu Market. Avoid the area. Emergency services en route.',
    timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
    radiusKm: 3,
    read: false,
  },
  {
    id: 'alt-seed-2',
    incidentId: 'inc-1',
    type: 'VERIFICATION',
    message: 'Incident reported nearby in Diobu Area. Can you confirm what you see?',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    radiusKm: 2,
    read: false,
  },
];

function buildVerifyAlert(incident: Incident): Alert {
  return {
    id: `alt-${Date.now()}-v`,
    incidentId: incident.id,
    type: 'VERIFICATION',
    message: `${incident.type} incident reported nearby. Are you a witness? Tap YES to verify.`,
    timestamp: new Date().toISOString(),
    radiusKm: 2,
    read: false,
  };
}

function buildGeoFenceAlert(incident: Incident): Alert {
  const isUrgent = incident.severityScore >= 8;
  const typeEmoji: Record<string, string> = {
    Fire: '🔥', Accident: '🚗', Crime: '🚨', Medical: '🚑', Flood: '🌊', Other: '⚠️',
  };
  const emoji = typeEmoji[incident.type] ?? '⚠️';
  return {
    id: `alt-${Date.now()}-g`,
    incidentId: incident.id,
    type: isUrgent ? 'URGENT' : 'CAUTIONARY',
    message: `${emoji} ${incident.type} verified near you. ${incident.cues[0] ?? 'Port Harcourt'}. ${isUrgent ? 'Avoid the area — emergency services dispatched.' : 'Exercise caution in the area.'}`,
    timestamp: new Date().toISOString(),
    radiusKm: isUrgent ? 3 : 2,
    read: false,
  };
}

export const useIncidentStore = create<IncidentStore>((set) => ({
  incidents: initialIncidents,
  alerts: initialAlerts,
  sessionId: SESSION_ID,
  sessionReports: stored?.reports ?? 0,
  sessionVerifications: stored?.verifications ?? 0,
  dismissedAlerts: stored?.dismissedAlerts ?? [],

  addIncident: (incidentData) => set((state) => {
    const { _id, ...rest } = incidentData as any;
    const id = _id ?? `inc-${Date.now()}`;
    if (state.incidents.some((i) => i.id === id)) return state;

    const now = new Date().toISOString();
    const newIncident: Incident = {
      ...rest,
      id,
      timestamp: now,
      status: 'UNVERIFIED',
      reportersCount: 1,
      source: rest.source ?? 'citizen',
      statusHistory: [{ status: 'UNVERIFIED', timestamp: now, note: 'First report received' }],
    };

    // Auto-create a VERIFICATION alert for this new incident
    const verifyAlert = buildVerifyAlert(newIncident);

    // Track session reports for citizen submissions
    const newReports = rest.source !== 'live' ? state.sessionReports + 1 : state.sessionReports;
    if (rest.source !== 'live') {
      const sess = loadSession();
      saveSession({ ...sess, reports: newReports });
    }

    return {
      incidents: [newIncident, ...state.incidents],
      alerts: [verifyAlert, ...state.alerts],
      sessionReports: newReports,
    };
  }),

  updateIncident: (id, updates) => set((state) => ({
    incidents: state.incidents.map((inc) => inc.id === id ? { ...inc, ...updates } : inc),
  })),

  confirmIncident: (incidentId, confirmed) => set((state) => {
    const inc = state.incidents.find((i) => i.id === incidentId);
    if (!inc || inc.status === 'CLOSED') return state;

    const newCount    = confirmed ? inc.reportersCount + 1 : inc.reportersCount;
    const confDelta   = confirmed ? 12 : -5;
    const newConf     = Math.max(10, Math.min(99, inc.confidenceScore + confDelta));
    const shouldVerify = confirmed && newCount >= VERIFY_THRESHOLD && inc.status === 'UNVERIFIED';
    const newStatus   = shouldVerify ? 'VERIFIED' : inc.status;

    const now = new Date().toISOString();
    const newHistory = shouldVerify
      ? [...(inc.statusHistory ?? []), { status: 'VERIFIED' as IncidentStatus, timestamp: now, note: `Crowd threshold reached (${newCount} reports)` }]
      : inc.statusHistory;

    const updatedIncidents = state.incidents.map((i) =>
      i.id === incidentId
        ? { ...i, reportersCount: newCount, confidenceScore: newConf, status: newStatus, statusHistory: newHistory }
        : i
    );

    // Track session verifications
    const newVers = state.sessionVerifications + 1;
    const sess = loadSession();
    saveSession({ ...sess, verifications: newVers });

    // Dispatch geo-fence alert when verified
    const newAlerts = shouldVerify
      ? [buildGeoFenceAlert({ ...inc, reportersCount: newCount, confidenceScore: newConf, status: 'VERIFIED' }), ...state.alerts]
      : state.alerts;

    return { incidents: updatedIncidents, alerts: newAlerts, sessionVerifications: newVers };
  }),

  verifyIncident: (id) => set((state) => {
    const inc = state.incidents.find((i) => i.id === id);
    if (!inc) return state;

    const now = new Date().toISOString();
    const updatedIncidents = state.incidents.map((i) => {
      if (i.id !== id) return i;
      const newCount = i.reportersCount + 1;
      const newConf  = Math.min(99, i.confidenceScore + 15);
      const newStatus: IncidentStatus = newCount >= VERIFY_THRESHOLD ? 'VERIFIED' : i.status;
      return {
        ...i,
        reportersCount: newCount,
        confidenceScore: newConf,
        status: newStatus,
        statusHistory: [...(i.statusHistory ?? []), { status: newStatus, timestamp: now, note: 'Operator verified' }],
      };
    });

    const updated = updatedIncidents.find((i) => i.id === id)!;
    const newAlerts = updated.status === 'VERIFIED'
      ? [buildGeoFenceAlert(updated), ...state.alerts]
      : state.alerts;

    return { incidents: updatedIncidents, alerts: newAlerts };
  }),

  closeIncident: (id) => set((state) => {
    const now = new Date().toISOString();
    return {
      incidents: state.incidents.map((inc) =>
        inc.id === id
          ? { ...inc, status: 'CLOSED', statusHistory: [...(inc.statusHistory ?? []), { status: 'CLOSED', timestamp: now, note: 'Resolved by operator' }] }
          : inc
      ),
    };
  }),

  addAlert: (alertData) => set((state) => ({
    alerts: [{ ...alertData, id: `alt-${Date.now()}`, timestamp: new Date().toISOString(), read: false }, ...state.alerts],
  })),

  dismissAlert: (id) => set((state) => {
    const newDismissed = [...state.dismissedAlerts, id];
    const sess = loadSession();
    saveSession({ ...sess, dismissedAlerts: newDismissed });
    return { dismissedAlerts: newDismissed };
  }),

  markAlertRead: (id) => set((state) => ({
    alerts: state.alerts.map((a) => a.id === id ? { ...a, read: true } : a),
  })),
}));
