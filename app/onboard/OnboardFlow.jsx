"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DLoader from "./DLoader";
import { saveAuth } from "../lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud";

const TOTAL_STEPS = 4;

const INDUSTRY_GOALS = {
  home_services: [
    { key: "emergency_dispatch",  label: "Dispatch emergency jobs",  sub: "Flood · burst pipe · no heat" },
    { key: "appointment_booking", label: "Book appointments",         sub: "Date · time · address" },
    { key: "phone_quotes",        label: "Give phone quotes",          sub: "Estimates with on-site caveat" },
    { key: "after_hours",         label: "Handle after-hours calls",  sub: "Log and reassure callers" },
  ],
  hospitality: [
    { key: "reservations",        label: "Take reservations",         sub: "Name · party size · date · time" },
    { key: "takeout_orders",      label: "Take takeout orders",       sub: "Items · instructions · pickup time" },
    { key: "menu_questions",      label: "Answer menu questions",     sub: "Specials · dietary · pricing" },
    { key: "complaint_handling",  label: "Handle complaints",         sub: "Escalate to manager in 24 h" },
  ],
  retail: [
    { key: "returns_exchanges",   label: "Handle returns & exchanges", sub: "Order details · reason" },
    { key: "product_availability",label: "Answer product questions",  sub: "Stock · sizing · colors" },
    { key: "custom_orders",       label: "Take custom orders",        sub: "Specs · timeline · contact" },
    { key: "store_info",          label: "Answer store info",         sub: "Hours · location · events" },
  ],
};

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
        Step 01 of 04
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
                onChange("industry", ind.value);
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


/* ── Step 2 — Account ────────────────────────────────────────────────────────*/

function StepDetails({ values, onChange, onBack, onSubmit, loading, error }) {
  const nameRef = useRef(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const canSubmit = values.name.trim() && values.email.trim() && values.password.length >= 8;

  return (
    <div className="mx-auto w-full max-w-[560px] px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-400">
        Step 02 of 04
      </p>
      <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
        Create your account.
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/40">
        You'll use this to log back in and manage your agent.
      </p>

      <div className="mt-10 grid gap-5">

        {/* Business name */}
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

        {/* Email */}
        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Work email
          </label>
          <input
            type="email"
            required
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40 focus:bg-white/[0.07]"
          />
        </div>

        {/* Password */}
        <div className="grid gap-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
            Password <span className="normal-case font-normal text-white/18">— min 8 characters</span>
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              required
              value={values.password}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 pr-14 text-base text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40 focus:bg-white/[0.07]"
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors text-[10px] font-semibold"
            >
              {showPass ? "hide" : "show"}
            </button>
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
          Continue <IconArrow />
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full rounded-full border border-white/8 py-3.5 text-sm font-semibold text-white/30 transition-all duration-150 hover:border-white/15 hover:text-white/60 active:scale-[0.98]"
        >
          Back
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-white/25">
        Already have an account?{" "}
        <a href="/login" className="text-white/50 underline underline-offset-2 hover:text-white/80 transition-colors">
          Log in
        </a>
      </p>
    </div>
  );
}


/* ── Step 3 — AI Goals ───────────────────────────────────────────────────────*/

function StepGoals({ values, onChange, onBack, onSubmit, loading, error }) {
  const goals = INDUSTRY_GOALS[values.industry] || [];
  const selected = values.aiGoals;

  function toggle(key) {
    onChange("aiGoals", selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key]
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-400">
        Step 03 of 04
      </p>
      <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">
        What should your<br />AI handle?
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/40">
        Pick everything you want your agent to do. It'll follow exact steps for each one.
      </p>

      <div className="mt-10 grid gap-3">
        {goals.map(({ key, label, sub }) => {
          const on = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all duration-150 active:scale-[0.98] ${
                on
                  ? "border-orange-500/50 bg-orange-500/8 shadow-[0_0_0_1px_rgba(249,115,22,0.2)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div>
                <p className={`text-sm font-bold transition-colors ${on ? "text-white" : "text-white/60"}`}>
                  {label}
                </p>
                <p className="mt-0.5 text-[11px] text-white/25">{sub}</p>
              </div>
              <div className={`ml-4 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-all ${
                on ? "border-orange-500 bg-orange-500" : "border-white/15"
              }`}>
                {on && <IconCheck />}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-orange-500/20 bg-orange-500/8 px-4 py-3 text-xs font-semibold text-orange-300">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-3">
        <button
          onClick={onSubmit}
          disabled={loading || selected.length === 0}
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


/* ── Step 4 — Success ────────────────────────────────────────────────────────*/

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
    email:    "",
    password: "",
    aiGoals:  [],
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
          email:    values.email.trim().toLowerCase(),
          password: values.password,
          ai_goals: values.aiGoals,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
      saveAuth(data.token, data.business);
      setResult(data.business);
      goTo(4);
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

  const animClass = step === 4 ? "step-success" : dir === "back" ? "step-back" : "step-forward";

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
              onSubmit={() => goTo(3)}
              loading={false}
              error=""
            />
          )}
          {step === 3 && (
            <StepGoals
              values={values}
              onChange={change}
              onBack={() => goTo(2, "back")}
              onSubmit={submit}
              loading={loading}
              error={error}
            />
          )}
          {step === 4 && result && (
            <StepSuccess result={result} businessName={values.name} />
          )}
        </div>
      </div>
    </div>
  );
}
