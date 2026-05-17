import React from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import "./styles.css";

const splineUrl = "https://my.spline.design/webdiagram-78ofgCvL78UwRylv2OO3z6iN/";

const modules = [
  { name: "Call", metric: "00:18", detail: "Inbound voice stream", x: "8%", y: "24%", delay: 0 },
  { name: "SMS", metric: "2-way", detail: "Owner + customer updates", x: "21%", y: "62%", delay: 0.15 },
  { name: "Email", metric: "Sent", detail: "Summary delivered", x: "72%", y: "20%", delay: 0.25 },
  { name: "Emergency", metric: "98%", detail: "Flooding detected", x: "64%", y: "58%", delay: 0.1 },
  { name: "Technician", metric: "ETA 12m", detail: "Nearest tech assigned", x: "44%", y: "14%", delay: 0.35 },
  { name: "CRM", metric: "Synced", detail: "Customer timeline updated", x: "82%", y: "70%", delay: 0.45 },
  { name: "IBM AI", metric: "Granite", detail: "Classify + route", x: "36%", y: "44%", delay: 0.05 },
];

const industries = [
  ["Home Services", "Emergency queue, appointment requests, technician dispatch"],
  ["Hospitality", "Reservations, active orders, complaints, catering inquiries"],
  ["Retail", "Orders, returns, product demand, customer recovery"],
];

const dashboardTickets = [
  ["Emergency Service", "Basement flooding", "HIGH", "Technician notified"],
  ["Appointment Request", "Water heater install", "MED", "Pending schedule"],
  ["Quote Request", "Drain cleaning cost", "LOW", "AI answered"],
];

const demoTranscript = "Hi, my basement is flooding and I need someone now.";
const demoStatuses = ["Intake", "Analyzing", "Dispatching", "Technician Notified"];

function useEmergencyDemo() {
  const [runId, setRunId] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);
  const [phase, setPhase] = React.useState(0);
  const [score, setScore] = React.useState(12);
  const [transcript, setTranscript] = React.useState("");

  React.useEffect(() => {
    if (!runId) return undefined;

    setIsRunning(true);
    setPhase(0);
    setScore(12);
    setTranscript("");

    const timers = [
      window.setTimeout(() => setPhase(1), 850),
      window.setTimeout(() => setScore(42), 1150),
      window.setTimeout(() => setPhase(2), 2600),
      window.setTimeout(() => setScore(74), 2950),
      window.setTimeout(() => setPhase(3), 4300),
      window.setTimeout(() => setScore(96), 4600),
      window.setTimeout(() => setIsRunning(false), 7200),
    ];

    let index = 0;
    const typing = window.setInterval(() => {
      index += 1;
      setTranscript(demoTranscript.slice(0, index));
      if (index >= demoTranscript.length) {
        window.clearInterval(typing);
      }
    }, 38);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearInterval(typing);
    };
  }, [runId]);

  function runDemo() {
    setRunId((current) => current + 1);
    window.setTimeout(() => {
      document.getElementById("simulation")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  return {
    isRunning,
    phase,
    score,
    transcript,
    status: demoStatuses[phase],
    runDemo,
  };
}

function Shell({ children }) {
  return (
    <div className="min-h-screen overflow-hidden bg-black text-white selection:bg-orange-500 selection:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,77,0,0.18),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(255,255,255,0.11),transparent_18%),linear-gradient(180deg,#050505_0%,#0b0b0d_45%,#050505_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Nav() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 px-4 py-4 backdrop-blur-2xl md:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 font-black shadow-[0_0_35px_rgba(255,77,0,.55)]">D</span>
          <span className="text-sm font-semibold tracking-[0.28em] text-white/90">DSPATCH</span>
        </a>
        <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#simulation" className="hover:text-white">Simulation</a>
          <a href="#mission" className="hover:text-white">Mission Control</a>
        </div>
        <a href="#cta" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-2xl backdrop-blur hover:bg-white/15">
          Request demo
        </a>
      </div>
    </nav>
  );
}

function FloatingModule({ module, active }) {
  return (
    <motion.div
      className={`floating-module absolute hidden w-44 rounded-2xl border p-4 backdrop-blur-2xl md:block ${
        active
          ? "border-orange-300/70 bg-orange-500/15 shadow-[0_0_70px_rgba(255,77,0,.55)]"
          : "border-white/15 bg-white/[0.075] shadow-[0_24px_80px_rgba(0,0,0,.55)]"
      }`}
      style={{ left: module.x, top: module.y }}
      initial={{ opacity: 0, y: 24, rotateX: -12 }}
      animate={{
        opacity: 1,
        y: active ? [0, -16, 0] : [0, -10, 0],
        rotateX: active ? [0, 7, 0] : 0,
        scale: active ? [1, 1.08, 1] : 1,
      }}
      transition={{ delay: module.delay, duration: 4, repeat: Infinity, repeatType: "mirror" }}
      whileHover={{ scale: 1.08, rotateY: 10, rotateX: 8, z: 60 }}
    >
      {active && <div className="pointer-events-none absolute -inset-3 rounded-[1.4rem] border border-orange-300/25 opacity-70" />}
      <div className={`mb-3 h-2 w-2 rounded-full ${active ? "bg-orange-200 shadow-[0_0_28px_rgba(255,200,140,1)]" : "bg-orange-400 shadow-[0_0_20px_rgba(255,115,55,.9)]"}`} />
      <p className="text-sm font-semibold">{module.name}</p>
      <p className="mt-2 text-2xl font-black text-orange-300">{module.metric}</p>
      <p className="mt-2 text-xs leading-5 text-white/55">{module.detail}</p>
    </motion.div>
  );
}

function isModuleActive(name, demo) {
  if (!demo.isRunning && demo.score === 12 && !demo.transcript) return false;
  if (name === "Call") return demo.phase >= 0;
  if (name === "IBM AI" || name === "Emergency") return demo.phase >= 1;
  if (name === "Technician") return demo.phase >= 2;
  if (name === "SMS" || name === "Email" || name === "CRM") return demo.phase >= 3;
  return false;
}

function Hero({ demo }) {
  return (
    <section id="top" className="relative min-h-screen overflow-hidden pt-28">
      <iframe
        className="absolute inset-0 h-full w-full scale-110 border-0 opacity-55"
        title="DSPatch 3D operations mesh"
        src={splineUrl}
        allow="autoplay; fullscreen; xr-spatial-tracking"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.94),rgba(0,0,0,.58)_45%,rgba(0,0,0,.86)),linear-gradient(180deg,transparent,rgba(0,0,0,.94))]" />
      <div className="absolute inset-0 perspective-1000">
        {modules.map((module) => (
          <FloatingModule key={module.name} module={module} active={isModuleActive(module.name, demo)} />
        ))}
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-12 px-4 pb-16 md:grid-cols-[1.05fr_.95fr] md:px-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="mb-5 inline-flex rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-orange-200">
            AI operations command center
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-tight text-white md:text-7xl lg:text-8xl">
            DSPatch turns chaos into command.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/66 md:text-xl">
            A cinematic AI layer for calls, texts, emergencies, technicians, tickets, CRM updates, and owner alerts in one live control plane.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={demo.runDemo}
              className="rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_45px_rgba(255,77,0,.45)] hover:bg-orange-400"
            >
              Run Emergency Demo
            </button>
            <a href="#mission" className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-bold text-white/90 backdrop-blur hover:bg-white/15">
              View mission control
            </a>
          </div>
        </motion.div>

        <HeroConsole demo={demo} />
      </div>
    </section>
  );
}

function HeroConsole({ demo }) {
  return (
    <motion.div
      className="relative rounded-[2rem] border border-white/15 bg-white/[0.065] p-4 shadow-[0_40px_120px_rgba(0,0,0,.65)] backdrop-blur-2xl"
      initial={{ opacity: 0, rotateY: -16, y: 30 }}
      animate={{ opacity: 1, rotateY: 0, y: 0 }}
      transition={{ duration: 0.9, delay: 0.2 }}
    >
      <div className="absolute -inset-px -z-10 rounded-[2rem] bg-gradient-to-br from-orange-500/35 via-white/10 to-transparent blur-sm" />
      <div className="rounded-[1.5rem] border border-white/10 bg-black/55 p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">Live system</p>
            <h2 className="mt-1 text-2xl font-bold">Emergency Intake</h2>
          </div>
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">{demo.status}</span>
        </div>
        <div className="space-y-3">
          {demoStatuses.map((label, index) => (
            <motion.div
              key={label}
              className={`rounded-2xl border p-4 transition ${index === demo.phase ? "border-orange-400/60 bg-orange-500/15" : index < demo.phase ? "border-orange-300/25 bg-orange-500/10" : "border-white/10 bg-white/[0.04]"}`}
              animate={{ scale: index === demo.phase ? 1.02 : 1 }}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">{label}</p>
                <span className="font-mono text-xs text-white/45">{index < demo.phase ? "Done" : index === demo.phase ? "Active" : "Queued"}</span>
              </div>
              {index === demo.phase && <p className="mt-2 text-sm leading-6 text-white/62">{demo.transcript || "Waiting for emergency signal..."}</p>}
            </motion.div>
          ))}
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-white/55">Urgency score</span>
            <motion.span className="font-bold text-orange-300" key={demo.score} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              {demo.score}%
            </motion.span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-orange-500" animate={{ width: `${demo.score}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HowItWorks() {
  const items = [
    ["01", "Capture", "Calls, texts, email, and missed requests land in one operating layer."],
    ["02", "Interpret", "AI extracts intent, urgency, sentiment, location, customer history, and next action."],
    ["03", "Command", "Tickets, technician routing, CRM sync, and owner alerts happen in seconds."],
  ];

  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-24 md:px-10 lg:py-32">
      <SectionHeader eyebrow="How it works" title="One control plane for every customer moment." />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map(([step, title, body]) => (
          <motion.article
            key={title}
            className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035))] p-7 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            whileHover={{ y: -6, rotateX: 3 }}
            transition={{ duration: 0.45 }}
          >
            <span className="font-mono text-xs font-black text-orange-300">{step}</span>
            <h3 className="mt-9 text-2xl font-bold tracking-tight">{title}</h3>
            <p className="mt-4 max-w-sm leading-7 text-white/60">{body}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section id="industries" className="mx-auto max-w-7xl px-4 py-20 md:px-10 lg:py-28">
      <SectionHeader eyebrow="Industries" title="Command centers tuned to the business type." />
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {industries.map(([name, detail], index) => (
          <motion.article
            key={name}
            className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.085] to-white/[0.03] p-6 shadow-2xl backdrop-blur"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            whileHover={{ y: -6 }}
          >
            <div className="relative mb-10 h-32 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.02))]">
              <div className="absolute left-5 top-5 h-14 w-14 rounded-2xl bg-orange-500/20 shadow-[0_0_50px_rgba(255,77,0,.35)]" />
              <div className="absolute bottom-5 left-5 right-5 h-px bg-gradient-to-r from-orange-300/70 to-transparent" />
              <div className="absolute right-5 top-7 grid gap-2">
                <span className="h-2 w-20 rounded-full bg-white/18" />
                <span className="h-2 w-14 rounded-full bg-white/10" />
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight">{name}</h3>
            <p className="mt-4 leading-7 text-white/60">{detail}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Simulation({ demo }) {
  return (
    <section id="simulation" className="mx-auto max-w-7xl px-4 py-24 md:px-10 lg:py-32">
      <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <SectionHeader eyebrow="Wow demo moment" title="Click once. Watch an emergency become an executed dispatch." />
        <button
          type="button"
          onClick={demo.runDemo}
          className="w-full rounded-full bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-[0_0_55px_rgba(255,77,0,.42)] transition hover:bg-orange-400 md:w-auto"
        >
          Run Emergency Demo
        </button>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-[1fr_.92fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.035))] p-5 shadow-[0_40px_120px_rgba(0,0,0,.62)] backdrop-blur-xl md:p-7">
          <motion.div
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent"
            animate={{ opacity: demo.isRunning ? [0.25, 1, 0.25] : 0.25 }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${demo.isRunning || demo.transcript ? "bg-orange-500 text-white" : "bg-white/10 text-white/55"}`}>
              INCOMING CALL
            </span>
            <span className="font-mono text-sm text-white/45">Detroit Plumbing Co.</span>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-black/50 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-white/38">Live transcript</p>
            <motion.p className="min-h-32 text-2xl font-semibold leading-10 tracking-tight md:text-3xl" animate={{ opacity: demo.transcript ? 1 : 0.55 }}>
              {demo.transcript || "Press Run Emergency Demo to begin intake."}
              {demo.isRunning && demo.phase <= 1 && <span className="ml-1 inline-block h-7 w-1 translate-y-1 bg-orange-300" />}
            </motion.p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[.85fr_1.15fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/38">Urgency score</p>
              <div className="mt-5 flex items-end justify-between">
                <motion.span className="text-5xl font-black text-orange-300" key={demo.score} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {demo.score}%
                </motion.span>
                <span className="pb-2 text-sm text-white/45">threshold 80%</span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full bg-orange-500 shadow-[0_0_30px_rgba(255,77,0,.75)]" animate={{ width: `${demo.score}%` }} transition={{ duration: 0.9, ease: "easeOut" }} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/38">System status</p>
              <div className="mt-5 grid gap-2">
                {demoStatuses.map((status, index) => (
                  <div key={status} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${index === demo.phase ? "bg-orange-500/15 text-orange-100" : index < demo.phase ? "bg-white/[0.06] text-white/65" : "text-white/32"}`}>
                    <span>{status}</span>
                    <span className="font-mono text-xs">{index < demo.phase ? "done" : index === demo.phase ? "live" : "wait"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <NotificationCards demo={demo} />
          <TechnicianDispatch demo={demo} />
        </div>
      </div>
    </section>
  );
}

function NotificationCards({ demo }) {
  const cards = [
    ["SMS", "Owner update", "Emergency ticket created. Technician Malik is en route.", demo.phase >= 3],
    ["Email", "Dispatch summary", "Transcript, urgency score, and customer callback attached.", demo.phase >= 3],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {cards.map(([type, title, body, sent], index) => (
        <motion.div
          key={type}
          className={`rounded-[1.5rem] border p-5 backdrop-blur-xl ${sent ? "border-orange-300/35 bg-orange-500/12 shadow-[0_0_50px_rgba(255,77,0,.22)]" : "border-white/10 bg-white/[0.045]"}`}
          initial={false}
          animate={{ y: sent ? 0 : 12, opacity: sent ? 1 : 0.48, scale: sent ? 1 : 0.98 }}
          transition={{ delay: index * 0.12, duration: 0.55, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-white/45">{type}</span>
            <span className={sent ? "text-xs font-bold text-orange-200" : "text-xs text-white/32"}>{sent ? "SENT" : "QUEUED"}</span>
          </div>
          <h3 className="mt-8 text-xl font-bold">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
        </motion.div>
      ))}
    </div>
  );
}

function TechnicianDispatch({ demo }) {
  const dispatched = demo.phase >= 2;

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/45 p-5 shadow-[0_35px_100px_rgba(0,0,0,.55)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/38">Technician</p>
          <h3 className="mt-2 text-2xl font-bold">Malik Johnson</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${dispatched ? "bg-orange-500 text-white" : "bg-emerald-400/15 text-emerald-200"}`}>
          {dispatched ? "DISPATCHED" : "AVAILABLE"}
        </span>
      </div>
      <div className="relative h-24 rounded-2xl border border-white/10 bg-white/[0.04]">
        <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-emerald-300/60 via-orange-300/60 to-orange-500/20" />
        <span className="absolute left-4 top-4 text-xs text-white/42">Available</span>
        <span className="absolute right-4 top-4 text-xs text-white/42">Dispatched</span>
        <motion.div
          className="absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-2xl bg-orange-500 font-black shadow-[0_0_45px_rgba(255,77,0,.65)]"
          animate={{ left: dispatched ? "calc(100% - 4rem)" : "1rem", rotate: dispatched ? 8 : 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.9, 0.2, 1] }}
        >
          M
        </motion.div>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/55">
        {dispatched ? "Route opened, customer callback attached, owner notified." : "Standing by for an urgent service assignment."}
      </p>
    </div>
  );
}

function MissionControl({ demo }) {
  return (
    <section id="mission" className="mx-auto max-w-7xl px-4 py-24 md:px-10 lg:py-32">
      <SectionHeader eyebrow="Mission Control" title="A live dashboard for the owner, not another inbox." />
      <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_50px_140px_rgba(0,0,0,.65)] backdrop-blur-2xl md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-3xl border border-white/10 bg-black/45 p-5">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">Emergency Queue</h3>
              <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">{demo.phase >= 2 ? "4 active" : "3 active"}</span>
            </div>
            <div className="space-y-3">
              {demo.phase >= 2 && (
                <motion.div
                  className="grid gap-3 rounded-2xl border border-orange-300/35 bg-orange-500/12 p-4 md:grid-cols-[1fr_1fr_80px_150px]"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="font-semibold">Emergency Service</span>
                  <span className="text-white/72">Basement flooding</span>
                  <span className="font-black text-orange-300">HIGH</span>
                  <span className="text-orange-200">{demo.status}</span>
                </motion.div>
              )}
              {dashboardTickets.map(([type, issue, priority, status]) => (
                <div key={issue} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_1fr_80px_150px]">
                  <span className="font-semibold">{type}</span>
                  <span className="text-white/58">{issue}</span>
                  <span className={priority === "HIGH" ? "font-black text-orange-300" : "text-white/58"}>{priority}</span>
                  <span className="text-white/58">{status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <MetricCard label="Calls recovered" value="47" />
            <MetricCard label="Avg response" value="04s" />
            <MetricCard label="Revenue saved" value="$18.4k" />
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <motion.div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6" whileHover={{ scale: 1.03 }}>
      <p className="text-sm uppercase tracking-[0.2em] text-white/38">{label}</p>
      <p className="mt-4 text-4xl font-black">{value}</p>
    </motion.div>
  );
}

function CTA({ runDemo }) {
  return (
    <section id="cta" className="px-4 py-28 md:px-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-orange-400/25 bg-[radial-gradient(circle_at_50%_0%,rgba(255,77,0,.28),transparent_38%),rgba(255,255,255,.06)] p-8 text-center shadow-[0_50px_140px_rgba(0,0,0,.7)] backdrop-blur-2xl md:p-14">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-orange-200">Ready for launch</p>
        <h2 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Give every small business an AI operations room.</h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
          Run the emergency demo, show the live command center, and make the product feel inevitable.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={runDemo} className="rounded-full bg-white px-6 py-3 text-sm font-black text-black hover:bg-orange-100">
            Run Emergency Demo
          </button>
          <a href="#top" className="rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white hover:bg-white/15">
            Back to command center
          </a>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.28em] text-orange-300">{eyebrow}</p>
      <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{title}</h2>
    </div>
  );
}

function App() {
  const demo = useEmergencyDemo();

  return (
    <Shell>
      <Nav />
      <Hero demo={demo} />
      <HowItWorks />
      <Industries />
      <Simulation demo={demo} />
      <MissionControl demo={demo} />
      <CTA runDemo={demo.runDemo} />
    </Shell>
  );
}

createRoot(document.getElementById("root")).render(<App />);
