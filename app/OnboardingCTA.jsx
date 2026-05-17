"use client";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  || "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud";

const INDUSTRIES = [
  { value: "home_services", label: "Home Services" },
  { value: "hospitality",   label: "Hospitality & Food" },
  { value: "retail",        label: "Retail" },
];

export default function OnboardingCTA() {
  const [step, setStep]       = useState("form");   // form | loading | success | error
  const [result, setResult]   = useState(null);
  const [errMsg, setErrMsg]   = useState("");

  const [name,      setName]      = useState("");
  const [industry,  setIndustry]  = useState("home_services");
  const [services,  setServices]  = useState("");
  const [weekday,   setWeekday]   = useState("8am – 6pm");
  const [weekend,   setWeekend]   = useState("9am – 3pm");
  const [areaCode,  setAreaCode]  = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStep("loading");

    const serviceList = services
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name,
      industry,
      services: serviceList,
      hours: {
        "mon-fri": weekday,
        "sat-sun": weekend,
      },
      ...(areaCode.trim() && { area_code: areaCode.trim() }),
    };

    try {
      const res  = await fetch(`${API_BASE}/businesses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      setResult(data);
      setStep("success");
    } catch (err) {
      setErrMsg(err.message);
      setStep("error");
    }
  }

  return (
    <section id="cta" className="bg-[#050505] px-5 py-28 text-white md:px-10">
      <div className="mx-auto max-w-2xl">

        {step === "success" ? (
          <div className="rounded-[2rem] border border-orange-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,.24),transparent_40%),rgba(255,255,255,.055)] p-8 text-center md:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-200">You're live</p>
            <h2 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
              {result.name} is on DSPatch.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/62">
              Your AI agent is active. Customers can call or text this number and your dashboard will update in real time.
            </p>
            <div className="mt-10 rounded-2xl border border-orange-400/30 bg-black/50 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-300">Your business number</p>
              <p className="mt-3 text-4xl font-black tracking-wide">
                {result.phone || "Provisioning…"}
              </p>
              <p className="mt-2 text-sm text-white/40">
                ID: {result.id}
              </p>
            </div>
            <p className="mt-8 text-sm text-white/40">
              Share this number with your customers. Every call and text flows through DSPatch.
            </p>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-orange-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,.24),transparent_40%),rgba(255,255,255,.055)] p-8 md:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-200">Get started</p>
            <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
              Set up your AI operations layer in 2 minutes.
            </h2>
            <p className="mt-3 text-white/50 text-sm leading-relaxed">
              Tell us about your business. We'll provision a dedicated number and connect it to your AI agent.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 grid gap-4">

              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Business name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Detroit Plumbing Co."
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-orange-400/60"
                />
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/60"
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Services <span className="normal-case font-normal text-white/30">(comma separated)</span>
                </label>
                <input
                  required
                  value={services}
                  onChange={(e) => setServices(e.target.value)}
                  placeholder="Emergency plumbing, Drain cleaning, Water heater repair"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-orange-400/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Weekday hours</label>
                  <input
                    value={weekday}
                    onChange={(e) => setWeekday(e.target.value)}
                    placeholder="8am – 6pm"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-orange-400/60"
                  />
                </div>
                <div className="grid gap-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/40">Weekend hours</label>
                  <input
                    value={weekend}
                    onChange={(e) => setWeekend(e.target.value)}
                    placeholder="9am – 3pm"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-orange-400/60"
                  />
                </div>
              </div>

              <div className="grid gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                  Area code <span className="normal-case font-normal text-white/30">(optional)</span>
                </label>
                <input
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="313"
                  maxLength={3}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-orange-400/60"
                />
              </div>

              {step === "error" && (
                <p className="text-sm text-orange-300">{errMsg}</p>
              )}

              <button
                type="submit"
                disabled={step === "loading"}
                className="mt-2 w-full rounded-full bg-white py-4 text-sm font-black text-black transition hover:bg-orange-100 disabled:opacity-50"
              >
                {step === "loading" ? "Setting up your agent…" : "Launch my AI agent →"}
              </button>

              <p className="text-center text-xs text-white/28">
                Free to start · No credit card · Your number is provisioned instantly
              </p>

            </form>
          </div>
        )}
      </div>
    </section>
  );
}
