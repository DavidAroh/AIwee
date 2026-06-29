/**
 * incidentSource — derive the provenance of an incident for the Control Room.
 *
 * Every collector tags its incidents with an id prefix (rss-, gdelt-, feed-,
 * reddit-, live-gemini-, inc-) and a "Name — URL" entry in corroboratingEvidence.
 * This turns that into a clean, displayable origin: which outlet/platform, what
 * kind of source, and a link back to the original article when we have one.
 */
import type { Incident } from "../store/useIncidentStore";

export type SourceKind = "citizen" | "news" | "social" | "ai";

export interface Provenance {
  kind: SourceKind;
  /** Short display label, e.g. "Punch", "Reddit", "Citizen Report". */
  label: string;
  /** Outlet/domain when known (news sources). */
  outlet?: string;
  /** Link to the original article/post, when available. */
  url?: string;
}

const KIND_META: Record<SourceKind, { label: string; tint: string; chip: string }> = {
  citizen: {
    label: "Citizen",
    tint: "#2563eb",
    chip: "bg-blue-600/10 text-blue-600 border-blue-600/25",
  },
  news: {
    label: "News",
    tint: "#0891b2",
    chip: "bg-cyan-600/10 text-cyan-700 border-cyan-600/25",
  },
  social: {
    label: "Social",
    tint: "#7c3aed",
    chip: "bg-violet-600/10 text-violet-700 border-violet-600/25",
  },
  ai: {
    label: "AI",
    tint: "#0d9488",
    chip: "bg-teal-600/10 text-teal-700 border-teal-600/25",
  },
};

export function sourceKindMeta(kind: SourceKind) {
  return KIND_META[kind];
}

export function getProvenance(inc: Incident): Provenance {
  const ev = inc.corroboratingEvidence?.[0] ?? "";
  const dash = ev.indexOf(" — ");
  const namePart = dash >= 0 ? ev.slice(0, dash).trim() : "";
  const url = ev.match(/https?:\/\/\S+/)?.[0];
  const id = inc.id ?? "";

  if (inc.source === "citizen" || id.startsWith("inc-")) {
    return { kind: "citizen", label: "Citizen Report" };
  }
  if (id.startsWith("reddit-")) {
    return { kind: "social", label: "Reddit", outlet: "Reddit", url };
  }
  if (id.startsWith("live-gemini")) {
    return { kind: "ai", label: "Gemini AI", url };
  }
  if (id.startsWith("gdelt-")) {
    return { kind: "news", label: namePart || "GDELT", outlet: namePart || "GDELT", url };
  }
  if (id.startsWith("rss-")) {
    return { kind: "news", label: namePart || "Google News", outlet: namePart, url };
  }
  if (id.startsWith("feed-")) {
    return { kind: "news", label: namePart || "News", outlet: namePart, url };
  }
  // Fallback for any other live incident
  if ((inc.cues ?? []).some((c) => /social|reddit/i.test(c))) {
    return { kind: "social", label: namePart || "Social", url };
  }
  return { kind: "news", label: namePart || "Live Feed", outlet: namePart, url };
}

/** Build a CSV string from a set of incidents (for ops export). */
export function incidentsToCsv(incidents: Incident[]): string {
  const headers = [
    "id",
    "type",
    "status",
    "severity",
    "confidence",
    "reports",
    "source",
    "outlet",
    "location",
    "latitude",
    "longitude",
    "timestamp",
    "summary",
    "url",
  ];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = incidents.map((i) => {
    const p = getProvenance(i);
    return [
      i.id,
      i.type,
      i.status,
      i.severityScore,
      i.confidenceScore,
      i.reportersCount,
      p.kind,
      p.outlet ?? p.label,
      i.cues[0] ?? "Port Harcourt",
      i.latitude.toFixed(5),
      i.longitude.toFixed(5),
      i.timestamp,
      i.summary || i.description,
      p.url ?? "",
    ]
      .map(esc)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}
