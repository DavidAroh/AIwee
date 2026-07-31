import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  ShieldAlert,
  Smartphone,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Flame,
  Waves,
  Car,
  HeartPulse,
  Siren,
  Fingerprint,
  ScanSearch,
  RadioTower,
  CheckCircle2,
} from 'lucide-react';

/* ─── Data ─────────────────────────────────────────────── */

const STATS = [
  { value: '2,437', label: 'Verified incidents' },
  { value: '98.2%', label: 'Network uptime' },
  { value: '4.1 min', label: 'Median verify time' },
  { value: '14,208', label: 'Active citizens' },
];

const FEATURES = [
  {
    index: '01',
    icon: ScanSearch,
    title: 'AI triage in seconds',
    desc: 'Gemini multimodal analysis reads photos, voice notes, and text — then classifies and scores every report before a human ever sees it.',
  },
  {
    index: '02',
    icon: RadioTower,
    title: 'Crowd verification',
    desc: 'Corroborating reports from citizens near the scene raise confidence automatically. Noise gets filtered. Signal gets through.',
  },
  {
    index: '03',
    icon: Fingerprint,
    title: 'Privacy by architecture',
    desc: 'No facial recognition. No biometric storage. No individual tracking. Anonymity is a design constraint, not a policy promise.',
  },
  {
    index: '04',
    icon: Siren,
    title: 'Live command room',
    desc: 'Operators watch a real-time severity heatmap of the city and dispatch responders with one click — human approval on every action.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'You report',
    desc: 'Snap a photo or record a voice note. GPS tags the location. Thirty seconds, no account required.',
  },
  {
    n: '02',
    title: 'AI verifies',
    desc: 'Gemini cross-checks the report against live feeds, weather data, and nearby citizen corroboration.',
  },
  {
    n: '03',
    title: 'City responds',
    desc: 'Verified incidents land on the control room map, ranked by severity. A human operator dispatches help.',
  },
];

const TICKER_ITEMS = [
  { icon: Flame, label: 'Fire contained', place: 'Diobu Market', time: '2m' },
  { icon: Waves, label: 'Flooding reported', place: 'Rumuigbo Junction', time: '14m' },
  { icon: Car, label: 'Road obstruction', place: 'Aba Road', time: '23m' },
  { icon: HeartPulse, label: 'Medical assist', place: 'GRA Phase II', time: '31m' },
  { icon: Siren, label: 'Responder dispatched', place: 'Trans-Amadi', time: '38m' },
  { icon: Waves, label: 'Drainage overflow', place: 'Mile 3', time: '44m' },
  { icon: Flame, label: 'Smoke sighted', place: 'Borokiri', time: '52m' },
  { icon: Car, label: 'Accident cleared', place: 'Ikwerre Road', time: '1h' },
];

const TRUST = [
  'No personal data sold or shared',
  'Open-source AI constraints',
  'Human-approved dispatch only',
  'Powered by Google Gemini',
];

/* ─── Motion helpers ───────────────────────────────────── */

const EASE = [0.22, 1, 0.36, 1] as const;

function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Live clock (mono, tabular) ───────────────────────── */

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = now.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return (
    <span className="font-mono text-xs tnum text-ink-mute tracking-wider">
      {fmt} WAT
    </span>
  );
}

/* ─── Phone mockup ─────────────────────────────────────── */

function PhoneMock() {
  return (
    <div className="phone-editorial w-[290px] h-[590px] rounded-[2.75rem] bg-ink overflow-hidden relative border border-ink/80">
      {/* Status bar */}
      <div className="h-10 flex items-center justify-between px-6 pt-1">
        <span className="text-[10px] font-semibold text-paper/70 font-mono tnum">9:41</span>
        <div className="w-16 h-4 bg-black rounded-full" />
        <div className="flex gap-1 items-center">
          <div className="w-4 h-2 border border-paper/40 rounded-[3px] relative">
            <div className="absolute inset-0.5 right-1 bg-signal rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* App content */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-signal" />
            <span className="text-sm font-bold text-paper tracking-tight">AiWee</span>
          </div>
          <div className="flex items-center gap-1 bg-paper/10 rounded-full px-2.5 py-1">
            <span className="text-[10px] text-paper font-medium">Map</span>
            <span className="text-[10px] text-paper/40 font-medium">Feed</span>
          </div>
        </div>

        {/* Map */}
        <div className="h-48 rounded-2xl bg-[#0c1626] relative overflow-hidden border border-paper/10">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(#1e3a5f 1px, transparent 1px), linear-gradient(90deg, #1e3a5f 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-paper drop-shadow-lg" />
          <div className="absolute top-8 left-12 w-2.5 h-2.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50">
            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping-slow opacity-60" />
          </div>
          <div className="absolute bottom-10 right-16 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
          <div className="absolute top-20 right-8 w-2.5 h-2.5 rounded-full bg-signal shadow-lg shadow-signal/50">
            <div className="absolute inset-0 rounded-full bg-signal animate-ping-slow opacity-60 delay-300" />
          </div>
          <div className="absolute top-3 left-3 right-3 bg-ink/80 backdrop-blur rounded-xl p-2.5 flex items-center gap-2 border border-paper/10">
            <div className="w-7 h-7 rounded-full bg-signal/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-signal" />
            </div>
            <div>
              <p className="text-[9px] text-paper/50 uppercase tracking-widest font-semibold font-mono">
                Active incidents
              </p>
              <p className="text-sm font-extrabold text-paper tnum">3</p>
            </div>
          </div>
        </div>

        {/* Feed cards */}
        {[
          { type: 'Fire', cls: 'text-red-400 bg-red-500/15', time: '2m ago', desc: 'Fire outbreak at Diobu Market' },
          { type: 'Flood', cls: 'text-sky-400 bg-sky-500/15', time: '15m ago', desc: 'Flooding at Rumuigbo junction' },
        ].map((item, i) => (
          <div key={i} className="bg-paper/[0.06] border border-paper/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${item.cls}`}>
                {item.type}
              </span>
              <span className="text-[9px] text-paper/40 font-mono tnum">{item.time}</span>
            </div>
            <p className="text-[11px] text-paper/70 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-ink/90 backdrop-blur border-t border-paper/10 flex items-center justify-around px-4">
        {['Home', 'Report', 'Alerts', 'Profile'].map((label, i) => (
          <div
            key={label}
            className={`flex flex-col items-center gap-1 ${i === 0 ? 'text-signal' : 'text-paper/30'}`}
          >
            <div className="w-4 h-4 rounded bg-current opacity-60" />
            <span className="text-[8px] font-semibold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default function Landing() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 80]);
  const ghostX = useTransform(scrollY, [0, 800], [0, -120]);

  return (
    <div className="landing-root grain min-h-dvh overflow-x-clip">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-paper/85 backdrop-blur-md border-b rule">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-ink rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
              <ShieldAlert className="w-4.5 h-4.5 text-paper" strokeWidth={2.2} />
            </div>
            <span className="display text-xl font-semibold tracking-tight">AiWee</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            <a href="#how" className="link-sweep text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              How it works
            </a>
            <a href="#capabilities" className="link-sweep text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Capabilities
            </a>
            <a href="#trust" className="link-sweep text-sm font-medium text-ink-soft hover:text-ink transition-colors">
              Trust
            </a>
          </nav>

          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-verified opacity-60 animate-ping-slow" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-verified" />
              </span>
              <span className="eyebrow !text-[10px]">Live · Port Harcourt</span>
            </div>
            <Link
              to="/citizen"
              className="btn-ink bg-ink text-paper text-sm font-semibold px-5 py-2.5 rounded-full"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative">
          <div className="hero-map-grid absolute inset-x-0 top-0 h-[560px] pointer-events-none" aria-hidden="true" />

          <div className="relative max-w-7xl mx-auto px-6 pt-16 lg:pt-24 pb-10">
            <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-start">
              {/* Copy */}
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="eyebrow flex items-center gap-3">
                    <span className="inline-block w-8 h-px bg-signal" aria-hidden="true" />
                    Civic safety network — Rivers State, Nigeria
                  </p>
                </Reveal>

                <Reveal delay={0.08}>
                  <h1 className="display text-[clamp(3rem,8.5vw,6.5rem)] font-semibold leading-[0.95] mt-6 text-balance">
                    The city
                    <br />
                    <em className="font-light italic text-signal">listens</em> back.
                  </h1>
                </Reveal>

                <Reveal delay={0.16}>
                  <p className="mt-8 text-lg text-ink-soft leading-relaxed max-w-md text-pretty">
                    AiWee turns citizen reports into verified, dispatched emergency
                    response. Report in thirty seconds — Gemini AI verifies, scores,
                    and routes every incident to the right responders.
                  </p>
                </Reveal>

                <Reveal delay={0.24}>
                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    <Link
                      to="/citizen"
                      id="cta-citizen"
                      className="btn-ink group inline-flex items-center justify-center gap-2.5 bg-ink text-paper font-semibold text-base px-8 py-4 rounded-full"
                    >
                      <Smartphone className="w-4.5 h-4.5 transition-transform duration-300 group-hover:-rotate-12" />
                      Report an incident
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      to="/control"
                      id="cta-control"
                      className="btn-ghost group inline-flex items-center justify-center gap-2.5 border border-ink/20 text-ink font-semibold text-base px-8 py-4 rounded-full"
                    >
                      <RadioTower className="w-4.5 h-4.5 text-signal" />
                      Control room
                      <ArrowUpRight className="w-4 h-4 opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </Reveal>

                <Reveal delay={0.32}>
                  <div className="mt-12 flex items-center gap-3 text-ink-mute">
                    <LiveClock />
                    <span className="w-1 h-1 rounded-full bg-ink-mute/50" aria-hidden="true" />
                    <span className="font-mono text-xs tracking-wider">4.8156° N, 7.0498° E</span>
                  </div>
                </Reveal>
              </div>

              {/* Phone */}
              <motion.div
                className="lg:col-span-5 flex justify-center lg:justify-end"
                style={{ y: heroY }}
                initial={{ opacity: 0, y: 48, rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
              >
                <div className="relative">
                  <div
                    className="absolute -inset-8 rounded-full bg-signal/10 blur-3xl"
                    aria-hidden="true"
                  />
                  <PhoneMock />
                  {/* Floating annotation */}
                  <motion.div
                    className="absolute -left-24 top-24 hidden xl:block"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="bg-paper border rule rounded-xl px-4 py-3 shadow-lg shadow-ink/10">
                      <p className="eyebrow !text-[9px]">Verify time</p>
                      <p className="display text-2xl font-semibold tnum mt-0.5">4.1 min</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Ghost word */}
          <motion.div
            className="relative select-none pointer-events-none overflow-hidden"
            style={{ x: ghostX }}
            aria-hidden="true"
          >
            <p className="display ghost-text text-[clamp(6rem,18vw,15rem)] font-bold leading-none whitespace-nowrap pl-6 -mb-6 lg:-mb-10">
              PORT HARCOURT
            </p>
          </motion.div>
        </section>

        {/* ── Ticker ── */}
        <section aria-label="Recent verified incidents" className="border-y rule bg-paper-deep/60 overflow-hidden">
          <div className="ticker-track py-3.5">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-8 shrink-0">
                <item.icon className="w-3.5 h-3.5 text-signal" strokeWidth={2.2} />
                <span className="text-sm font-medium text-ink">{item.label}</span>
                <span className="text-sm text-ink-mute">{item.place}</span>
                <span className="font-mono text-[11px] text-ink-mute/70 tnum">{item.time}</span>
                <span className="w-1 h-1 rounded-full bg-ink/20 ml-5" aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="border-t-2 border-ink pt-5">
                  <p className="display text-5xl lg:text-6xl font-semibold tnum tracking-tight">
                    {s.value}
                  </p>
                  <p className="eyebrow mt-3">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── How it works — dark section ── */}
        <section id="how" className="bg-ink text-paper scroll-mt-16">
          <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4">
                <Reveal>
                  <p className="eyebrow !text-paper/40 flex items-center gap-3">
                    <span className="inline-block w-8 h-px bg-signal" aria-hidden="true" />
                    The pipeline
                  </p>
                  <h2 className="display text-4xl lg:text-5xl font-semibold leading-[1.05] mt-5 text-balance">
                    Thirty seconds from street to dispatch.
                  </h2>
                  <p className="mt-6 text-paper/60 leading-relaxed max-w-xs">
                    No call centers. No waiting on hold. The shortest possible path
                    between seeing something and getting help moving.
                  </p>
                </Reveal>
              </div>

              <div className="lg:col-span-8 grid sm:grid-cols-3 gap-px bg-paper/10 rounded-2xl overflow-hidden border border-paper/10">
                {STEPS.map((step, i) => (
                  <Reveal key={step.n} delay={i * 0.1} className="h-full">
                    <div className="relative bg-ink p-8 h-full flex flex-col group hover:bg-[#16233c] transition-colors duration-300">
                      <span
                        className="display step-watermark text-7xl font-bold absolute top-4 right-6 select-none transition-all duration-500 group-hover:-translate-y-1"
                        aria-hidden="true"
                      >
                        {step.n}
                      </span>
                      <div className="mt-16">
                        <h3 className="display text-2xl font-semibold">{step.title}</h3>
                        <p className="mt-3 text-sm text-paper/55 leading-relaxed">{step.desc}</p>
                      </div>
                      <div className="mt-auto pt-8">
                        <div className="h-px bg-paper/15 w-full relative overflow-hidden">
                          <div className="absolute inset-y-0 left-0 w-0 bg-signal transition-all duration-700 group-hover:w-full" />
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Capabilities — editorial index rows ── */}
        <section id="capabilities" className="max-w-7xl mx-auto px-6 py-24 lg:py-32 scroll-mt-16">
          <div className="grid lg:grid-cols-12 gap-10 mb-14">
            <Reveal className="lg:col-span-7">
              <p className="eyebrow flex items-center gap-3">
                <span className="inline-block w-8 h-px bg-signal" aria-hidden="true" />
                Capabilities
              </p>
              <h2 className="display text-4xl lg:text-6xl font-semibold leading-[1.02] mt-5 text-balance">
                Built for real emergencies, not demos.
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="lg:col-span-5 flex items-end">
              <p className="text-ink-soft leading-relaxed max-w-sm">
                Every feature was designed around Port Harcourt's actual urban
                challenges — flooding, market fires, grid failures, and the
                response gaps between them.
              </p>
            </Reveal>
          </div>

          <div className="border-t rule">
            {FEATURES.map((f, i) => (
              <Reveal key={f.index} delay={i * 0.06}>
                <div className="feature-row group grid grid-cols-12 items-center gap-4 lg:gap-8 py-7 lg:py-9 border-b rule px-2 lg:px-4 -mx-2 lg:-mx-4 cursor-default">
                  <span className="feature-index col-span-2 lg:col-span-1 font-mono text-sm text-ink-mute tnum transition-colors duration-300">
                    {f.index}
                  </span>
                  <div className="col-span-10 lg:col-span-4 flex items-center gap-4">
                    <f.icon className="w-5 h-5 text-signal shrink-0" strokeWidth={1.8} />
                    <h3 className="display text-xl lg:text-2xl font-semibold tracking-tight">
                      {f.title}
                    </h3>
                  </div>
                  <p className="col-span-10 col-start-3 lg:col-span-6 lg:col-start-6 text-sm lg:text-base text-ink-soft leading-relaxed">
                    {f.desc}
                  </p>
                  <div className="hidden lg:flex col-span-1 justify-end">
                    <ArrowUpRight className="feature-arrow w-5 h-5 text-signal" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Trust ── */}
        <section id="trust" className="border-t rule bg-paper-deep/50 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-6 py-20 lg:py-24">
            <div className="grid lg:grid-cols-12 gap-10 items-start">
              <Reveal className="lg:col-span-4">
                <p className="eyebrow flex items-center gap-3">
                  <span className="inline-block w-8 h-px bg-signal" aria-hidden="true" />
                  Trust
                </p>
                <h2 className="display text-3xl lg:text-4xl font-semibold leading-tight mt-5">
                  Constraints we hold ourselves to.
                </h2>
              </Reveal>
              <div className="lg:col-span-8 grid sm:grid-cols-2 gap-x-10 gap-y-6">
                {TRUST.map((t, i) => (
                  <Reveal key={t} delay={i * 0.07}>
                    <div className="flex items-start gap-3.5 group">
                      <CheckCircle2 className="w-5 h-5 text-verified shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
                      <span className="text-base font-medium text-ink-soft group-hover:text-ink transition-colors">
                        {t}
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="max-w-7xl mx-auto px-6 py-24 lg:py-36">
          <Reveal>
            <div className="relative bg-ink text-paper rounded-[2rem] px-8 py-16 lg:px-20 lg:py-24 overflow-hidden">
              <div
                className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-signal/20 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-signal/10 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-8">
                  <p className="eyebrow !text-paper/40">Get started</p>
                  <h2 className="display text-4xl lg:text-6xl font-semibold leading-[1.02] mt-5 text-balance">
                    Your report could be the one that matters.
                  </h2>
                  <p className="mt-6 text-paper/60 leading-relaxed max-w-lg">
                    Free for every citizen of Port Harcourt. No account needed to
                    report. Works on any phone with a camera and a signal.
                  </p>
                </div>
                <div className="lg:col-span-4 flex flex-col gap-4 lg:items-end">
                  <Link
                    to="/citizen"
                    className="group inline-flex items-center justify-center gap-2.5 bg-signal text-paper font-semibold text-base px-8 py-4 rounded-full transition-all duration-300 hover:bg-signal-deep hover:-translate-y-0.5 hover:shadow-xl hover:shadow-signal/25 active:scale-[0.98] w-full lg:w-auto"
                  >
                    <Smartphone className="w-4.5 h-4.5 transition-transform duration-300 group-hover:-rotate-12" />
                    Open citizen app
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    to="/control"
                    className="group inline-flex items-center justify-center gap-2 text-sm font-medium text-paper/60 hover:text-paper transition-colors"
                  >
                    Operator? Enter the control room
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t rule">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-ink rounded-md flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-paper" strokeWidth={2.2} />
              </div>
              <div>
                <p className="display font-semibold leading-none">AiWee</p>
                <p className="text-xs text-ink-mute mt-1">
                  Civic incident response — Port Harcourt, Rivers State
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-x-8 gap-y-3" aria-label="Footer">
              <Link to="/citizen" className="link-sweep text-sm text-ink-soft hover:text-ink transition-colors">
                Citizen app
              </Link>
              <Link to="/control" className="link-sweep text-sm text-ink-soft hover:text-ink transition-colors">
                Control room
              </Link>
              <a href="#trust" className="link-sweep text-sm text-ink-soft hover:text-ink transition-colors">
                Privacy
              </a>
              <a href="#trust" className="link-sweep text-sm text-ink-soft hover:text-ink transition-colors">
                Terms
              </a>
            </nav>

            <p className="font-mono text-xs text-ink-mute tnum">
              v1.0 · © 2026 · Built with Gemini AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
