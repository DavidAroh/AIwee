export const theme = {
  bg: "#ffffff",
  surface: "#f8fafc",
  surfaceAlt: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  text2: "#334155",
  muted: "#64748b",
  muted2: "#94a3b8",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  red: "#dc2626",
  amber: "#f59e0b",
  teal: "#0d9488",
};

// Inter — matches the web app's typeface. Loaded in App via useFonts.
export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extra: "Inter_800ExtraBold",
  black: "Inter_900Black",
};

export const radius = { sm: 10, md: 16, lg: 20, xl: 24, pill: 999 };

// Subtle card shadow to match the web's elevated surfaces.
export const cardShadow = {
  shadowColor: "#0f172a",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const TYPE_COLOR: Record<string, string> = {
  Fire: "#ef4444",
  Accident: "#f59e0b",
  Crime: "#ec4899",
  Medical: "#2563eb",
  "Natural Disaster": "#06b6d4",
  Other: "#8b5cf6",
};

// Tinted pill background per incident type (colored, ~14% opacity) — mirrors
// the web's `bg-<color>/15 text-<color>` badges.
export const TYPE_TINT: Record<string, string> = {
  Fire: "rgba(239,68,68,0.12)",
  Accident: "rgba(245,158,11,0.12)",
  Crime: "rgba(236,72,153,0.12)",
  Medical: "rgba(37,99,235,0.12)",
  "Natural Disaster": "rgba(6,182,212,0.12)",
  Other: "rgba(139,92,246,0.12)",
};

// Exact mirror of the web TYPE_CONFIG (bg tint + text color per type).
export const TYPE_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  Fire: { bg: "rgba(239,68,68,0.15)", text: "#f87171", dot: "#ef4444" },
  Accident: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24", dot: "#f59e0b" },
  Crime: { bg: "rgba(236,72,153,0.15)", text: "#f472b6", dot: "#ec4899" },
  Medical: { bg: "rgba(37,99,235,0.15)", text: "#3b82f6", dot: "#2563eb" },
  "Natural Disaster": { bg: "rgba(6,182,212,0.15)", text: "#22d3ee", dot: "#06b6d4" },
  Other: { bg: "rgba(203,213,225,0.4)", text: "#334155", dot: "#64748b" },
};

export function confColor(c: number): string {
  return c >= 70 ? "#10b981" : c >= 40 ? "#f59e0b" : "#ef4444";
}
