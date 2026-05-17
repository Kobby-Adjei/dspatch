"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const demoSlides = [
  {
    title: "Choose business type",
    body: "This is a mock demo using Detroit Plumbing Co. No customer input is collected here.",
    type: "choices",
    eyebrow: "Mock demo",
    options: ["Home Services", "Hospitality", "Retail"],
  },
  {
    title: "Company profile",
    body: "DSPATCH builds the operating profile around a real local business example.",
    type: "fields",
    eyebrow: "Detroit Plumbing Co.",
    fields: [
      ["Business", "Detroit Plumbing Co."],
      ["Industry", "Home Services"],
      ["Location", "Detroit, MI"],
    ],
  },
  {
    title: "Services",
    body: "Services become routing categories for calls, SMS, tickets, and booking requests.",
    type: "chips",
    eyebrow: "Service catalog",
    options: ["Emergency plumbing", "Drain cleaning", "Water heater installation"],
  },
  {
    title: "Hours",
    body: "Business hours guide response timing and after-hours escalation.",
    type: "fields",
    eyebrow: "Availability",
    fields: [
      ["Standard hours", "Mon-Fri 8am-6pm"],
      ["After hours", "Create urgent ticket"],
      ["Escalation", "Immediate callback for emergencies"],
    ],
  },
  {
    title: "Pricing and service area",
    body: "Pricing and location context helps DSPATCH answer accurately.",
    type: "fields",
    eyebrow: "Coverage",
    fields: [
      ["Emergency visit", "Starts at $149"],
      ["Drain cleaning", "Starts at $99"],
      ["Service area", "Detroit, Dearborn, Southfield, Warren"],
    ],
  },
  {
    title: "Support needs",
    body: "DSPATCH learns what to answer, what to escalate, and what to log.",
    type: "toggles",
    eyebrow: "Support layer",
    options: ["Calls", "FAQs", "Emergency requests"],
  },
  {
    title: "Generated operations modules",
    body: "The setup turns into enterprise-level operating modules for the business.",
    type: "modules",
    eyebrow: "Generated system",
    options: ["Booking", "Tickets", "Workflows", "Support"],
  },
  {
    title: "Dashboard preview",
    body: "The final command center shows calls, tickets, bookings, and savings in one place.",
    type: "dashboard",
    eyebrow: "Command center",
  },
];

const formSlides = [
  {
    title: "Business name",
    body: "What should customers see when DSPATCH answers on behalf of your business?",
    inputType: "text",
    fields: [["Business name", "Detroit Plumbing Co."]],
  },
  {
    title: "Industry",
    body: "Choose the operating model DSPATCH should use for routing, ticketing, and support.",
    choices: ["Home Services", "Hospitality", "Retail"],
  },
  {
    title: "Location",
    body: "Where is your primary business location?",
    inputType: "text",
    fields: [["Primary location", "Detroit, MI"]],
  },
  {
    title: "Services offered",
    body: "List the requests DSPATCH should recognize, classify, and route.",
    inputType: "textarea",
    fields: [["Services", "Emergency plumbing, drain cleaning, water heater installation"]],
  },
  {
    title: "Business hours",
    body: "Set normal availability so DSPATCH knows when to answer, schedule, or escalate.",
    inputType: "text",
    fields: [["Business hours", "Mon-Fri 8am-6pm"]],
  },
  {
    title: "Pricing setup",
    body: "Add common prices or starting rates that can help customers get clear answers.",
    inputType: "textarea",
    fields: [["Pricing", "Emergency visit starts at $149"]],
  },
  {
    title: "Service area",
    body: "Where should DSPATCH accept and route customer requests?",
    inputType: "textarea",
    fields: [["Service area", "Detroit, Dearborn, Southfield"]],
  },
  {
    title: "Support and booking needs",
    body: "Choose the customer interactions DSPATCH should handle from day one.",
    choices: ["Calls", "SMS", "FAQs", "Emergency requests", "Booking requests", "Quote requests"],
  },
  {
    title: "Review your setup",
    body: "Confirm the operating system DSPATCH is about to generate.",
    type: "review",
  },
  {
    title: "Generate My Operating System",
    body: "DSPATCH will create your booking system, AI support layer, workflows, and dashboard.",
    type: "generate",
  },
];

const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 430 : -240,
    opacity: 0,
    scale: 0.965,
    filter: "blur(14px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction) => ({
    x: direction > 0 ? -270 : 330,
    opacity: 0,
    scale: 0.965,
    filter: "blur(14px)",
  }),
};

export default function OnboardingPage() {
  const [mode, setMode] = useState("demo");
  const [[step, direction], setStep] = useState([0, 0]);
  const [selected, setSelected] = useState({});
  const slides = formSlides;
  const isCta = mode === "cta";
  const activeSlide = mode === "form" ? slides[step] : null;

  function goTo(nextStep) {
    const boundedStep = Math.min(Math.max(nextStep, 0), slides.length - 1);
    setStep([boundedStep, boundedStep > step ? 1 : -1]);
  }

  function next() {
    if (mode === "form" && step === formSlides.length - 1) {
      setMode("generating");
      return;
    }

    if (step < slides.length - 1) {
      goTo(step + 1);
    }
  }

  function back() {
    if (mode === "generating") {
      setMode("form");
      setStep([formSlides.length - 1, -1]);
      return;
    }

    if (step > 0) {
      goTo(step - 1);
    }
  }

  function startRealOnboarding() {
    setMode("form");
    setStep([0, 1]);
  }

  const progressLabel = isCta
    ? "Demo complete"
    : mode === "generating"
      ? "Generating system"
      : mode === "demo"
      ? step < demoSlides.length ? `Demo ${step + 1} of ${demoSlides.length}` : "Demo complete"
      : `Form ${step + 1} of ${formSlides.length}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-5 py-7 text-white md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_8%,rgba(255,106,0,.14),transparent_34%),radial-gradient(circle_at_88%_72%,rgba(255,106,0,.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.025),transparent_22%,rgba(0,0,0,.3))]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1500px] flex-col">
        <header className="flex items-center justify-between gap-4">
          <Link href="/platform" className="text-sm font-bold text-orange-300 hover:text-orange-100">
            DSPATCH
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/40">{progressLabel}</p>
        </header>

        <section className="grid flex-1 items-center gap-10 py-9 lg:grid-cols-[0.68fr_1.32fr]">
          <IntroCopy mode={mode} />

          <div className="relative min-h-[650px] overflow-hidden rounded-lg border border-white/10 bg-[#070707]/96 shadow-[0_32px_120px_rgba(0,0,0,.72)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,.12),transparent_34%)]" />
            {mode === "demo" ? (
              <DemoScroller
                active={step}
                onActiveChange={setStep}
                onStart={startRealOnboarding}
              />
            ) : (
              <AnimatePresence custom={direction} mode="wait">
                {mode === "generating" ? (
                <GenerationScreen key="generating" />
                ) : isCta ? (
                  <CtaScreen key="cta" onStart={startRealOnboarding} />
                ) : (
                <motion.article
                  key={`${mode}-${activeSlide.title}`}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col p-6 md:p-10"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-7">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">
                        {activeSlide.eyebrow || (mode === "form" ? "Real onboarding" : "Mock demo")}
                      </p>
                      <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{activeSlide.title}</h2>
                    </div>
                    <ProgressDots active={step} total={slides.length} />
                  </div>

                  <div className="grid flex-1 content-center gap-8 py-10">
                    <p className="max-w-3xl text-base leading-7 text-white/58 md:text-lg">{activeSlide.body}</p>
                    {mode === "demo" ? (
                      <DemoContent slide={activeSlide} />
                    ) : (
                      <FormContent
                        slide={activeSlide}
                        selected={selected[step]}
                        onChoose={(value) => setSelected((current) => ({ ...current, [step]: value }))}
                      />
                    )}
                  </div>
                </motion.article>
                )}
              </AnimatePresence>
            )}
          </div>
        </section>

        <footer className={mode === "demo" ? "hidden" : "flex items-center justify-between gap-4 pb-1"}>
          <button
            type="button"
            onClick={back}
            disabled={mode !== "cta" && mode !== "generating" && step === 0}
            className="rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-bold text-white/82 transition hover:border-white/20 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Back
          </button>
          {mode === "generating" ? (
            <Link
              href="/platform"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-100"
            >
              Finish
            </Link>
          ) : !isCta ? (
            <button
              type="button"
              onClick={next}
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-100"
            >
              {mode === "form" && step === formSlides.length - 1 ? "Generate" : "Continue"}
            </button>
          ) : (
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/32">Start when ready</span>
          )}
        </footer>
      </div>
    </main>
  );
}

function IntroCopy({ mode }) {
  if (mode === "generating") {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">System generation</p>
        <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl xl:text-7xl">
          Your operating system is being assembled.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-white/58 md:text-lg">
          DSPATCH is converting your onboarding details into booking, support, workflow, and dashboard modules.
        </p>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Real onboarding</p>
        <h1 className="mt-5 text-4xl font-black leading-[0.98] tracking-tight text-white md:text-6xl xl:text-7xl">
          Build your own operating system.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-white/58 md:text-lg">
          One focused step at a time. DSPATCH uses your business details to prepare booking, ticketing, workflows, and support.
        </p>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-16">
      <p className="text-6xl font-black uppercase leading-none tracking-tight text-orange-500 md:text-8xl xl:text-9xl">
        DEMO
      </p>
      <h1 className="mt-8 max-w-md text-xl font-semibold leading-8 tracking-tight text-white/72 md:text-2xl">
        Watch DSPATCH build a business OS.
      </h1>
    </div>
  );
}

function DemoScroller({ active, onActiveChange, onStart }) {
  const total = demoSlides.length + 1;

  function handleScroll(event) {
    const nextIndex = Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth);
    if (nextIndex !== active) {
      onActiveChange([nextIndex, nextIndex > active ? 1 : -1]);
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        onScroll={handleScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Mock DSPATCH onboarding demo"
      >
        {demoSlides.map((slide, index) => (
          <motion.article
            key={slide.title}
            initial={{ x: 180, opacity: 0, filter: "blur(10px)" }}
            whileInView={{ x: 0, opacity: 1, filter: "blur(0px)" }}
            viewport={{ amount: 0.72 }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="grid min-w-full snap-center content-center gap-8 p-6 md:p-10"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">{slide.eyebrow}</p>
                <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{slide.title}</h2>
              </div>
              <ProgressDots active={Math.min(active, demoSlides.length - 1)} total={demoSlides.length} />
            </div>
            <div className="grid gap-8">
              <p className="max-w-3xl text-base leading-7 text-white/58 md:text-lg">{slide.body}</p>
              <DemoContent slide={slide} />
            </div>
          </motion.article>
        ))}

        <motion.article
          key="demo-cta"
          initial={{ x: 180, opacity: 0, filter: "blur(10px)" }}
          whileInView={{ x: 0, opacity: 1, filter: "blur(0px)" }}
          viewport={{ amount: 0.72 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="grid min-w-full snap-center place-items-center p-6 md:p-10"
        >
          <div className="max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Demo complete</p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">
              Ready to build your own business operating system?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/58 md:text-lg">
              Start your real onboarding process and DSPATCH will generate your operations system from your business details.
            </p>
            <motion.button
              type="button"
              whileHover={{ y: -3, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStart}
              className="mt-9 rounded-full bg-orange-500 px-8 py-4 text-sm font-bold text-black transition hover:bg-orange-300"
            >
              Start My Business Onboarding
            </motion.button>
          </div>
        </motion.article>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={index === active ? "h-2 w-7 rounded-full bg-orange-500" : "h-2 w-2 rounded-full bg-white/18"}
          />
        ))}
      </div>
    </div>
  );
}

function DemoContent({ slide }) {
  if (slide.type === "choices") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {slide.options.map((option, index) => (
          <div
            key={option}
            className={index === 0 ? "rounded-lg border border-orange-300/35 bg-orange-500/15 p-6 text-left shadow-[0_20px_60px_rgba(255,106,0,.10)]" : "rounded-lg border border-white/10 bg-white/[0.045] p-6 text-left"}
          >
            <span className="mb-5 block h-9 w-9 rounded-full border border-white/10 bg-black/70" />
            <p className={index === 0 ? "text-sm font-bold text-orange-100" : "text-sm font-bold text-white/50"}>{option}</p>
          </div>
        ))}
      </div>
    );
  }

  if (slide.type === "chips") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {slide.options.map((option) => (
          <div key={option} className="rounded-lg border border-orange-300/25 bg-orange-500/10 p-5 text-sm font-bold text-orange-100">
            {option}
          </div>
        ))}
      </div>
    );
  }

  if (slide.type === "fields") {
    return <ReadOnlyFields fields={slide.fields} />;
  }

  if (slide.type === "toggles") {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {slide.options.map((option) => (
          <div key={option} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <span className="text-sm font-bold text-white/78">{option}</span>
            <span className="h-6 w-11 rounded-full bg-orange-500 p-1">
              <span className="ml-auto block h-4 w-4 rounded-full bg-black" />
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (slide.type === "modules") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {slide.options.map((option) => (
          <div key={option} className="rounded-lg border border-white/10 bg-white/[0.045] p-6">
            <span className="mb-7 block h-2 w-20 rounded-full bg-orange-500/70" />
            <h3 className="text-lg font-black">{option}</h3>
            <p className="mt-3 text-sm leading-6 text-white/48">Generated from Detroit Plumbing Co. setup data.</p>
          </div>
        ))}
      </div>
    );
  }

  return <DashboardPreview />;
}

function FormContent({ slide, selected, onChoose }) {
  if (slide.type === "review") {
    return <ReviewSetup />;
  }

  if (slide.type === "generate") {
    return (
      <div className="grid gap-5">
        <div className="rounded-lg border border-orange-300/25 bg-orange-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">Ready to generate</p>
          <h3 className="mt-4 text-2xl font-black text-white">DSPATCH operating system</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            Your onboarding details will be transformed into booking flows, ticket routing, support logic, workflows, and dashboard modules.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {["Booking system", "AI support layer", "Operational workflows", "Live dashboard"].map((module) => (
            <div key={module} className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
              <span className="mb-6 block h-2 w-20 rounded-full bg-orange-500/70" />
              <p className="text-sm font-bold text-white/78">{module}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.fields) {
    return (
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        {slide.fields.map(([label, placeholder]) => (
          <label key={label} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition focus-within:border-orange-300/45 focus-within:bg-white/[0.075]">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/38">{label}</span>
            {slide.inputType === "textarea" ? (
              <textarea
                placeholder={placeholder || label}
                rows={4}
                className="resize-none rounded-lg border border-white/10 bg-black/80 px-4 py-4 text-base font-semibold leading-7 text-white outline-none transition placeholder:text-white/26 focus:border-orange-300/50"
              />
            ) : (
              <input
                placeholder={placeholder || label}
                className="rounded-lg border border-white/10 bg-black/80 px-4 py-4 text-base font-semibold text-white outline-none transition placeholder:text-white/26 focus:border-orange-300/50"
              />
            )}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {slide.choices.map((choice) => (
        <motion.button
          key={choice}
          type="button"
          whileHover={{ y: -4, scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChoose(choice)}
          className={selected === choice ? "rounded-lg border border-orange-300/35 bg-orange-500/15 p-6 text-left text-sm font-bold text-orange-100 shadow-[0_20px_60px_rgba(255,106,0,.10)] transition" : "rounded-lg border border-white/10 bg-white/[0.055] p-6 text-left text-sm font-bold text-white/76 transition hover:border-white/18 hover:bg-white/[0.075]"}
        >
          <span className={selected === choice ? "mb-5 block h-8 w-8 rounded-full bg-orange-500 shadow-[0_0_24px_rgba(255,106,0,.35)]" : "mb-5 block h-8 w-8 rounded-full border border-white/12 bg-black/70"} />
          {choice}
        </motion.button>
      ))}
    </div>
  );
}

function ReviewSetup() {
  const rows = [
    ["Business", "Your business profile"],
    ["Industry", "Selected operating model"],
    ["Location", "Primary market and service base"],
    ["Services", "Customer request categories"],
    ["Support", "Calls, SMS, FAQs, emergency routing"],
    ["Operations", "Booking, tickets, workflows, dashboard"],
  ];

  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-white/10 bg-white/[0.045] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">Review</p>
            <h3 className="mt-3 text-2xl font-black">Operating system blueprint</h3>
          </div>
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">Ready</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-black/70 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/34">{label}</p>
            <p className="mt-3 text-sm font-bold text-white/78">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenerationScreen() {
  const modules = [
    "Creating booking system...",
    "Creating AI support layer...",
    "Creating workflows...",
    "Creating dashboard...",
  ];

  return (
    <motion.article
      key="generation-screen"
      variants={variants}
      custom={1}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 grid content-center gap-8 p-6 md:p-10"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Generation complete</p>
        <h2 className="mt-4 text-3xl font-black leading-tight md:text-5xl">Your DSPATCH system is ready.</h2>
      </div>

      <div className="grid gap-3">
        {modules.map((module, index) => (
          <div key={module} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-white/78">{module}</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.35 }}
                className="text-xs font-bold text-orange-300"
              >
                Done
              </motion.span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.span
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: index * 0.35, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="block h-full rounded-full bg-orange-500"
              />
            </div>
          </div>
        ))}
      </div>

      <GeneratedDashboardPreview />
    </motion.article>
  );
}

function GeneratedDashboardPreview() {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.7, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-lg border border-orange-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,.16),transparent_42%),rgba(255,255,255,.045)] p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Generated dashboard</p>
          <h3 className="mt-2 text-xl font-black">Operations Command Center</h3>
        </div>
        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-black">Live</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[
          ["24/7", "AI support"],
          ["Ready", "Booking"],
          ["Active", "Tickets"],
          ["Built", "Workflows"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-md border border-white/10 bg-black/70 p-4">
            <p className="text-lg font-black">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/34">{label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function CtaScreen({ onStart }) {
  return (
    <motion.article
      key="cta-screen"
      variants={variants}
      custom={1}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 grid place-items-center p-6 md:p-10"
    >
      <div className="max-w-3xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Demo complete</p>
        <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-6xl">
          Ready to build your own business operating system?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/58 md:text-lg">
          Start your real onboarding process and DSPATCH will generate your operations system from your business details.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-9 rounded-full bg-orange-500 px-8 py-4 text-sm font-bold text-black transition hover:bg-orange-300"
        >
          Start My Business Onboarding
        </button>
      </div>
    </motion.article>
  );
}

function ReadOnlyFields({ fields }) {
  return (
    <div className="grid gap-5">
      {fields.map(([label, value]) => (
        <label key={label} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-5">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/38">{label}</span>
          <input readOnly value={value} className="rounded-md border border-white/10 bg-black px-4 py-4 text-base font-semibold text-white outline-none" />
        </label>
      ))}
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-orange-300/25 bg-orange-500/10 p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-black">Detroit Plumbing Co.</h3>
          <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-black">LIVE PREVIEW</span>
        </div>
        <p className="mt-3 text-sm text-white/62">Emergency request detected - immediate callback recommended.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["47", "Calls"],
          ["12", "Tickets"],
          ["09", "Bookings"],
          ["$18.4k", "Savings"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <p className="text-3xl font-black">{value}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/38">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressDots({ active, total }) {
  return (
    <div className="hidden gap-1.5 sm:flex">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={index <= active ? "h-2 w-6 rounded-full bg-orange-500" : "h-2 w-2 rounded-full bg-white/18"}
        />
      ))}
    </div>
  );
}
