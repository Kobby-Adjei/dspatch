"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DLoader from "./DLoader";
import { saveAuth } from "../lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud";

const TOTAL_STEPS = 3;

const INDUSTRIES = [
  {
    value: "home_services",
    label: "Home Services",
    sub: "Plumbing · HVAC · Electrical · Auto repair",
    services: ["Emergency service", "Appointment scheduling", "Quote requests", "Drain cleaning", "Water heater repair", "Pipe inspection"],
  },
  {
    value: "hospitality",
    label: "Hospitality",
    sub: "Restaurants · Cafes · Hotels · Catering",
    services: ["Reservations", "Takeout orders", "Catering inquiries", "Complaint handling", "Event booking", "Hours inquiry"],
  },
  {
    value: "retail",
    label: "Retail",
    sub: "Boutiques · Beauty · Local shops",
    services: ["Product inquiries", "Order requests", "Returns & exchanges", "Stock checks", "Store hours", "Custom orders"],
  },
];


/* ── Icons ─────────────────────────────────────────────────────────────────── */

function IconHome({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.5L14 3l11 10.5" />
      <rect x="6" y="13" width="16" height="12" rx="1.5" />
      <path d="M10.5 25v-6h7v6" />
    </svg>
  );
}

function IconHospitality({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20c0-4.97 4.03-9 9-9s9 4.03 9 9" />
      <line x1="3" y1="20" x2="25" y2="20" />
      <line x1="14" y1="8.5" x2="14" y2="5.5" />
      <circle cx="14" cy="4" r="2" fill={color} stroke="none" />
    </svg>
  );
}

function IconRetail({ size = 28, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3L3.5 8v16a2 2 0 002 2h17a2 2 0 002-2V8L21 3z" />
      <line x1="3.5" y1="8" x2="24.5" y2="8" />
      <path d="M18.5 12a4.5 4.5 0 01-9 0" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = { home_services: IconHome, hospitality: IconHospitality, retail: IconRetail };


/* ── Progress bar ────────────────────────────────────────────────────────────*/

function ProgressBar({ step }) {
  const pct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;
  return (
    <div className="fixed inset-x-0 top-0 z-[200] h-[2px] bg-white/6">
      <div
        className="h-full bg-orange-500 transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}


/* ── Step 1 — Industry ───────────────────────────────────────────────────────*/

function StepIndustry({ values, onChange, onNext }) {
  const selected = values.industry;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-400">
        Step 01 of 03
      </p>
      <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
        What kind of business<br />do you run?
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/40">
        We'll configure your AI agent for your industry.
      </p>

      <div className="mt-10 grid grid-cols-3 gap-3">
        {INDUSTRIES.map((ind) => {
          const Icon = ICONS[ind.value];
          const active = selected === ind.value;
          return (
            <button
              key={ind.value}
              type="button"
              onClick={() => {
                const preset = INDUSTRIES.find((i) => i.value === ind.value);
                onChange("industry", ind.value);
                onChange("services", [...preset.services]);
              }}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 active:scale-[0.97] ${
                active
                  ? "border-orange-500/50 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_8px_32px_rgba(249,115,22,0.12)]"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* visual area */}
              <div className={`flex h-28 w-full items-center justify-center transition-all duration-200 ${
                active
                  ? "bg-[linear-gradient(135deg,rgba(255,106,0,0.38),rgba(255,255,255,0.05))]"
                  : "bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] group-hover:bg-[linear-gradient(135deg,rgba(255,106,0,0.12),rgba(255,255,255,0.04))]"
              }`}>
                <Icon
                  size={28}
                  color={active ? "#f97316" : "rgba(255,255,255,0.3)"}
                />
              </div>

              {/* text */}
              <div className="p-3">
                <p className={`text-xs font-black leading-tight tracking-tight transition-colors duration-200 ${
                  active ? "text-white" : "text-white/60"
                }`}>
                  {ind.label}
                </p>
                <p className="mt-1 text-[10px] leading-tight text-white/25">
                  {ind.sub.split(" · ")[0]}
                </p>
              </div>

              {/* selection ring */}
              {active && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
                  <IconCheck />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-black text-black transition-all duration-150 hover:bg-orange-50 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
      >
        Continue <IconArrow />
      </button>
    </div>
  );
}


/* ── Step 2 — Details ────────────────────────────────────────────────────────*/

function StepDetails({ values, onChange, onBack, onSubmit, loading, error }) {
  const nameRef = useRef(null);
  const [custom, setCustom]     = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const preset = INDUSTRIES.find((i) => i.value === values.industry);
  const allChips = preset
    ? [...new Set([...preset.services, ...values.services])]
    : values.services;

  function toggleService(s) {
    const curr = values.services;
    onChange("services", curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s]);
  }

  function addCustom() {
    const t = custom.trim();
    if (!t || values.services.includes(t)) return;
    onChange("services", [...values.services, t]);
    setCustom("");
  }

  const canSubmit = values.name.trim() && values.services.length > 0 && values.email.trim() && values.password.length >= 8;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-400">
        Step 02 of 03
      </p>
      <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
        About your business.
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/40">
        Your AI agent will use this to respond accurately.
      </p>

      <div className="mt-10 grid gap-7">

        {/* Name */}
        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Business name
          </label>
          <input
            ref={nameRef}
            required
            value={values.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Detroit Plumbing Co."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base font-semibold text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40 focus:bg-white/[0.07]"
          />
        </div>

        {/* Services */}
        <div className="grid gap-3">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Services offered
          </label>
          <div className="flex flex-wrap gap-2">
            {allChips.map((s) => {
              const on = values.services.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.96] ${
                    on
                      ? "border border-orange-500/40 bg-orange-500/12 text-orange-200"
                      : "border border-white/10 bg-white/[0.04] text-white/35 hover:border-white/20 hover:text-white/60"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
              placeholder="Add a service…"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!custom.trim()}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-bold text-white/40 transition-all duration-150 hover:border-white/20 hover:text-white/70 disabled:opacity-30"
            >
              Add
            </button>
          </div>
        </div>

        {/* Hours */}
        <div className="grid gap-3">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Business hours
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Mon – Fri", values.weekday, (v) => onChange("weekday", v), "8am – 6pm"],
              ["Sat – Sun", values.weekend, (v) => onChange("weekend", v), "9am – 3pm"],
            ].map(([label, val, set, ph]) => (
              <div key={label} className="grid gap-1.5">
                <span className="text-[10px] text-white/25">{label}</span>
                <input
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Area code */}
        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Area code <span className="normal-case font-normal text-white/18">— optional, for a local number</span>
          </label>
          <input
            value={values.areaCode}
            onChange={(e) => onChange("areaCode", e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="313"
            maxLength={3}
            className="w-32 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40"
          />
        </div>

        {/* Account credentials */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-5 grid gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Your account — log back in anytime
          </p>

          <div className="grid gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.20em] text-white/25">
              Work email
            </label>
            <input
              type="email"
              required
              value={values.email}
              onChange={(e) => onChange("email", e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.20em] text-white/25">
              Password <span className="normal-case font-normal text-white/18">— min 8 characters</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                value={values.password}
                onChange={(e) => onChange("password", e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors text-[10px] font-semibold"
              >
                {showPass ? "hide" : "show"}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.20em] text-white/25">
              Alert phone <span className="normal-case font-normal text-white/18">— optional, get SMS on emergencies</span>
            </label>
            <input
              type="tel"
              value={values.alertPhone}
              onChange={(e) => onChange("alertPhone", e.target.value)}
              placeholder="+13135550100"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/8 px-4 py-3 text-xs font-semibold text-orange-300">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-3">
        <button
          onClick={onSubmit}
          disabled={loading || !canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-black text-black transition-all duration-150 hover:bg-orange-50 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
        >
          Launch my AI agent <IconArrow />
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full rounded-full border border-white/8 py-3.5 text-sm font-semibold text-white/30 transition-all duration-150 hover:border-white/15 hover:text-white/60 active:scale-[0.98]"
        >
          Back
        </button>
      </div>
    </div>
  );
}


/* ── Step 3 — Success ────────────────────────────────────────────────────────*/

function StepSuccess({ result, businessName }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.phone || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  return (
    <div className="step-success mx-auto w-full max-w-[560px] px-6">

      {/* live badge */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-400">
          Agent active
        </span>
      </div>

      <h2 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
        {businessName || result.name}<br />
        <span className="text-white/30">is live.</span>
      </h2>

      <p className="mt-4 text-sm leading-relaxed text-white/40">
        Your AI agent is online. Every call and text to this number flows through DSPatch automatically.
      </p>

      {/* phone number */}
      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
        <div className="bg-white/[0.03] px-6 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/25">
            Your business number
          </p>
          <p className="mt-3 text-5xl font-black tracking-tight text-white">
            {result.phone || "Provisioning…"}
          </p>
          <p className="mt-2 font-mono text-[11px] text-white/20">
            {result.id}
          </p>
        </div>
        <div className="border-t border-white/8 px-6 py-4">
          <button
            onClick={copy}
            className={`flex items-center gap-2 text-xs font-semibold transition-all duration-150 ${
              copied ? "text-orange-400" : "text-white/35 hover:text-white/70"
            }`}
          >
            {copied ? (
              <><IconCheck /> Copied to clipboard</>
            ) : (
              <><IconCopy /> Copy number</>
            )}
          </button>
        </div>
      </div>

      {/* what happens now */}
      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/22">
          What happens now
        </p>
        <div className="mt-4 grid gap-4">
          {[
            ["Share this number with your customers.", "Calls and texts are answered immediately by your AI agent, 24/7."],
            ["Every interaction becomes a ticket.", "Urgency is detected automatically — emergencies surface first."],
            ["Your dashboard updates in real time.", "Open your command center to see and manage everything."],
          ].map(([title, body], i) => (
            <div key={i} className="flex gap-4">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-black text-orange-400">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-white/70">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/30">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/dashboard"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-black text-black transition-all duration-150 hover:bg-orange-50 active:scale-[0.98]"
      >
        Open command center <IconArrow />
      </Link>
    </div>
  );
}


/* ── Shell ───────────────────────────────────────────────────────────────────*/

export default function OnboardFlow() {
  const [step, setStep]       = useState(1);
  const [dir, setDir]         = useState("forward");
  const [stepKey, setStepKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [result, setResult]   = useState(null);

  const [values, setValues] = useState({
    industry: null,
    name:     "",
    services: [],
    weekday:  "8am – 6pm",
    weekend:  "9am – 3pm",
    areaCode: "",
    email:      "",
    password:   "",
    alertPhone: "",
  });

  function change(key, val) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function goTo(s, direction = "forward") {
    setDir(direction);
    setStep(s);
    setStepKey((k) => k + 1);
  }

  async function submit() {
    if (!values.name.trim())         { setError("Business name is required."); return; }
    if (!values.industry)            { setError("Please select an industry."); return; }
    if (values.services.length === 0){ setError("Select at least one service."); return; }
    if (!values.email.trim())        { setError("Work email is required."); return; }
    if (values.password.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/businesses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:     values.name.trim(),
          industry: values.industry,
          services: values.services,
          hours:    { "mon-fri": values.weekday || "8am – 6pm", "sat-sun": values.weekend || "Closed" },
          email:    values.email.trim().toLowerCase(),
          password: values.password,
          ...(values.areaCode.trim()   && { area_code:   values.areaCode.trim() }),
          ...(values.alertPhone.trim() && { alert_phone: values.alertPhone.trim() }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
      saveAuth(data.token, data.business);
      setResult(data.business);
      goTo(3);
    } catch (err) {
      if (err.name === "TypeError" && err.message.includes("fetch")) {
        setError("Could not reach the server. Make sure the backend is running.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const animClass = step === 3 ? "step-success" : dir === "back" ? "step-back" : "step-forward";

  return (
    <div className="min-h-screen bg-black text-white">
      {loading && <DLoader />}
      <ProgressBar step={step} />

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-[100] border-b border-white/6 bg-black/85 backdrop-blur-2xl">
        <nav className="flex h-16 items-center justify-between px-6">
          <Link href="/" aria-label="DSPatch home">
            <img src="/dspatch_logo.svg" alt="DSPatch" className="h-12 w-48 object-contain object-left" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/28 transition-colors hover:text-white/60"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
        </nav>
      </header>

      {/* Steps */}
      <div className="flex min-h-screen flex-col justify-center pt-24 pb-20">
        <div key={stepKey} className={`w-full ${animClass}`}>
          {step === 1 && (
            <StepIndustry
              values={values}
              onChange={change}
              onNext={() => goTo(2)}
            />
          )}
          {step === 2 && (
            <StepDetails
              values={values}
              onChange={change}
              onBack={() => goTo(1, "back")}
              onSubmit={submit}
              loading={loading}
              error={error}
            />
          )}
          {step === 3 && result && (
            <StepSuccess result={result} businessName={values.name} />
          )}
        </div>
      </div>
    </div>
  );
}
