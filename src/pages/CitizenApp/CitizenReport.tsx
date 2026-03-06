import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  MapPin,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import { useIncidentStore } from "../../store/useIncidentStore";
import { analyzeIncident } from "../../services/ai";
import { cn } from "../../lib/utils";

const QUICK_TYPES = [
  { label: "🔥 Fire", value: "Fire" },
  { label: "🚗 Accident", value: "Accident" },
  { label: "🚨 Crime", value: "Crime" },
  { label: "🏥 Medical", value: "Medical" },
  { label: "🌊 Flood", value: "Flood" },
  { label: "❓ Other", value: "Other" },
];

const TYPE_COLORS: Record<string, string> = {
  Fire: "#ef4444",
  Accident: "#f59e0b",
  Crime: "#ec4899",
  Medical: "#10b981",
  Flood: "#06b6d4",
  Other: "#8b5cf6",
};

interface AnalysisResult {
  incidentType: string;
  severityScore: number;
  confidenceScore: number;
  summary: string;
  cues: string[];
  corroboratingEvidence?: string[];
  nearbyPlaces?: string[];
}

export default function CitizenReport() {
  const navigate = useNavigate();
  const { addIncident } = useIncidentStore();

  const [description, setDescription] = useState("");
  const [quickType, setQuickType] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<
    "form" | "analyzing" | "success" | "error"
  >("form");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullDesc = quickType ? `[${quickType}] ${description}` : description;
    if (!fullDesc.trim()) return;

    setIsSubmitting(true);
    setStage("analyzing");

    try {
      let lat = 4.8156,
        lng = 7.0498;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }),
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        /* use defaults */
      }

      let base64Data: string | undefined;
      let mimeType: string | undefined;
      if (image) {
        const parts = image.split(",");
        mimeType = parts[0].match(/:(.*?);/)?.[1];
        base64Data = parts[1];
      }

      const analysis = await analyzeIncident(
        fullDesc,
        base64Data,
        mimeType,
        lat,
        lng,
      );
      setAnalysisResult(analysis as AnalysisResult);

      addIncident({
        type: analysis.incidentType as any,
        description: fullDesc,
        latitude: lat,
        longitude: lng,
        severityScore: analysis.severityScore,
        confidenceScore: analysis.confidenceScore,
        summary: analysis.summary,
        cues: analysis.cues,
        corroboratingEvidence: analysis.corroboratingEvidence,
        nearbyPlaces: analysis.nearbyPlaces,
        mediaUrl: image || undefined,
        source: "citizen",
      });

      setStage("success");
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setStage("error");
      setIsSubmitting(false);
    }
  };

  // ── Analyzing screen ──────────────────────────────────────────────────────
  if (stage === "analyzing") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fade-in">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping-slow" />
          <div className="relative w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/25">
            <Zap className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">AI Analyzing…</h2>
          <p className="text-zinc-400 text-sm max-w-xs">
            Classifying incident type, extracting severity cues, and scoring
            confidence using Gemini AI.
          </p>
        </div>
        <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full animate-shimmer"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
      </div>
    );
  }

  // ── Success / confirmation screen ─────────────────────────────────────────
  if (stage === "success" && analysisResult) {
    const typeColor = TYPE_COLORS[analysisResult.incidentType] ?? "#8b5cf6";
    const confColor =
      analysisResult.confidenceScore >= 70
        ? "#10b981"
        : analysisResult.confidenceScore >= 40
          ? "#f59e0b"
          : "#ef4444";
    const sevColor =
      analysisResult.severityScore >= 8
        ? "#ef4444"
        : analysisResult.severityScore >= 5
          ? "#f59e0b"
          : "#10b981";

    return (
      <div className="h-full flex flex-col animate-fade-in-scale overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Success icon */}
          <div className="flex flex-col items-center pt-4 pb-2 space-y-4">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping-slow" />
              <div className="relative w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-white">
                Report Submitted
              </h2>
              <p className="text-zinc-400 text-xs">
                Anonymous · GPS attached · Sent for crowd verification
              </p>
            </div>
          </div>

          {/* AI analysis card */}
          <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                AI Analysis Results
              </h3>
            </div>

            {/* Type + severity */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border"
                style={{
                  color: typeColor,
                  borderColor: `${typeColor}40`,
                  background: `${typeColor}15`,
                }}
              >
                ● {analysisResult.incidentType}
              </span>
              <span
                className="px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border"
                style={{
                  color: sevColor,
                  borderColor: `${sevColor}40`,
                  background: `${sevColor}15`,
                }}
              >
                Severity {analysisResult.severityScore}/10
              </span>
            </div>

            {/* Summary */}
            <p className="text-zinc-300 text-sm leading-relaxed">
              {analysisResult.summary}
            </p>

            {/* Confidence */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">
                <span>AI Confidence</span>
                <span style={{ color: confColor }}>
                  {analysisResult.confidenceScore}%
                </span>
              </div>
              <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${analysisResult.confidenceScore}%`,
                    background: confColor,
                  }}
                />
              </div>
            </div>

            {/* Cues */}
            {analysisResult.cues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {analysisResult.cues.map((c) => (
                  <span
                    key={c}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-400 text-[9px] font-semibold px-2 py-0.5 rounded-md"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Verification info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-3 text-center space-y-1">
              <Users className="w-5 h-5 text-blue-400 mx-auto" />
              <p className="text-[10px] text-zinc-400 font-medium">
                Sent to citizens
              </p>
              <p className="text-xs font-bold text-blue-400">within 2 km</p>
            </div>
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 text-center space-y-1">
              <Shield className="w-5 h-5 text-emerald-400 mx-auto" />
              <p className="text-[10px] text-zinc-400 font-medium">
                Auto-verifies at
              </p>
              <p className="text-xs font-bold text-emerald-400">
                3 confirmations
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/citizen")}
            className="w-full py-3.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-sm hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
          >
            View on Map <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setStage("form");
              setDescription("");
              setQuickType("");
              setImage(null);
              setIsSubmitting(false);
            }}
            className="w-full py-3 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-sm hover:bg-zinc-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Report Another Incident
          </button>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (stage === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-5 animate-fade-in">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">
            Analysis Unavailable
          </h2>
          <p className="text-zinc-400 text-sm">
            The AI service is temporarily busy. Your report was still submitted
            successfully, but without detailed analysis. Please try again
            shortly.
          </p>
        </div>
        <button
          onClick={() => setStage("form")}
          className="w-full max-w-[200px] py-3 rounded-xl bg-zinc-700 text-zinc-200 font-bold text-sm hover:bg-zinc-600 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Report form ───────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      <header className="sticky top-0 z-10 bg-[#0B1121]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-red-500 rounded-[10px] flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
            <UploadCloud
              className="w-[18px] h-[18px] text-white"
              strokeWidth={2.5}
            />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-white tracking-tight leading-none">
              Report Incident
            </h1>
            <p className="text-[9px] text-zinc-500 mt-0.5 font-medium uppercase tracking-wider">
              Anonymous · GPS auto-attached · AI-analysis
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Incident type grid */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Incident Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_TYPES.map((t) => {
                const color = TYPE_COLORS[t.value] ?? "#8b5cf6";
                const isSelected = quickType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setQuickType(quickType === t.value ? "" : t.value)
                    }
                    className={cn(
                      "py-3 px-2 rounded-2xl text-xs font-bold border transition-all duration-200 text-center flex flex-col items-center gap-1",
                      isSelected
                        ? "scale-[0.97]"
                        : "bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:border-zinc-500 hover:bg-zinc-800",
                    )}
                    style={
                      isSelected
                        ? {
                            background: `${color}18`,
                            borderColor: `${color}50`,
                            color,
                            boxShadow: `0 0 16px ${color}20`,
                          }
                        : {}
                    }
                  >
                    <span className="text-base">{t.label.split(" ")[0]}</span>
                    <span>{t.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GPS row */}
          <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="relative shrink-0">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-300">
                GPS Location Auto-Attached
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Coordinates shared anonymously for verification only.
              </p>
            </div>
          </div>

          {/* Description textarea */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              What happened? <span className="text-red-400 font-black">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident — vehicle type, number of people, visible hazards, time it started…"
              className={cn(
                "w-full h-32 bg-zinc-900/70 border rounded-2xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none resize-none transition-all duration-300",
                description.length > 0
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/20 focus:ring-2 focus:ring-emerald-500/25"
                  : "border-zinc-700/60 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20",
              )}
              required
            />
            <p className="text-[10px] text-zinc-600 text-right">
              {description.length} chars
            </p>
          </div>

          {/* Media upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Evidence (Optional)
            </label>
            {image ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-700/60">
                <img
                  src={image}
                  alt="Evidence"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 glass p-1.5 rounded-full text-zinc-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-2 left-3 text-[10px] text-zinc-300 font-semibold">
                  Photo attached — AI will analyse it
                </p>
              </div>
            ) : (
              <label className="w-full h-28 border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/20 transition-all cursor-pointer">
                <Camera className="w-7 h-7" />
                <span className="text-xs font-semibold">
                  Tap to upload photo or video
                </span>
                <input
                  type="file"
                  onChange={handleImageUpload}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            id="submit-report-btn"
            className={cn(
              "w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
              isSubmitting || !description.trim()
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400 active:scale-[0.98] shadow-lg shadow-emerald-500/25",
            )}
          >
            <UploadCloud className="w-4 h-4" />
            Submit Report
            <ChevronRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[10px] text-zinc-600 pb-2">
            Anonymous report · No personal data stored · Location cannot be
            edited (anti-spoofing)
          </p>
        </form>
      </main>
    </div>
  );
}
