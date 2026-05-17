import LoopingSplineFrame from "../LoopingSplineFrame";
import BusinessValueCarousel from "./BusinessValueCarousel";

const heroSplineUrl = "https://my.spline.design/webdiagram-78ofgCvL78UwRylv2OO3z6iN/";

const industries = [
  ["Home Services", "Emergency dispatch, appointment intake, technician routing"],
  ["Hospitality", "Reservations, orders, complaints, catering requests"],
  ["Retail", "Orders, returns, product demand, customer recovery"],
];

const workflow = [
  ["01", "Answer", "Every call, SMS, and inquiry is captured immediately."],
  ["02", "Classify", "AI detects urgency, intent, customer details, and next action."],
  ["03", "Dispatch", "The owner sees a clean operational record and response path."],
];

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-2xl">
      <nav className="flex h-24 items-center justify-between px-1 md:px-2">
        <a href="#top" aria-label="DSPatch home" className="flex items-center">
          <img
            src="/dspatch_logo.svg"
            alt="DSPatch"
            className="h-20 w-64 object-contain object-left md:w-72"
          />
        </a>

        <div className="hidden items-center gap-8 text-sm font-medium text-orange-300 md:flex">
          <a href="#how" className="hover:text-orange-100">How it works</a>
          <a href="#industries" className="hover:text-orange-100">Industries</a>
          <a href="#operators" className="hover:text-orange-100">Operators</a>
          <a href="#mission" className="hover:text-orange-100">Mission Control</a>
        </div>

        <a
          href="#cta"
          className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-orange-100 sm:inline-flex"
        >
          Request demo
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative min-h-screen overflow-hidden bg-black pt-24">
      <div className="relative h-[calc(100vh-14rem)] min-h-[480px] overflow-hidden">
        <LoopingSplineFrame
          className="absolute inset-0 h-full w-full scale-105 border-0 opacity-95"
          title="DSPatch 3D operations mesh"
          src={heroSplineUrl}
          intervalMs={18000}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18),transparent_34%,rgba(0,0,0,.18))]" />
        <div className="absolute inset-x-0 bottom-0 h-[clamp(4.25rem,8.5vh,6.25rem)] bg-black px-5 md:px-10">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-center">
            <h1 className="typewriter-headline translate-y-[clamp(1rem,2.4vh,1.75rem)] overflow-hidden whitespace-nowrap text-center text-[clamp(.95rem,2.35vw,2.25rem)] font-black leading-none tracking-tight text-white">
              Run your <span className="text-orange-500">small business</span> with <span className="text-orange-500">enterprise-level operations</span>
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}

function Operators() {
  return (
    <section id="operators" className="relative overflow-hidden bg-black px-5 py-32 text-white md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(255,106,0,.18),transparent_34%),radial-gradient(circle_at_18%_20%,rgba(255,106,0,.09),transparent_28%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div className="operator-story-copy">
          <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
            Local talent powering modern business operations.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/60">
            DSPATCH helps businesses scale operations while creating new opportunities for Detroit graduates.
          </p>
        </div>

        <div className="operator-carousel-overlay operator-showcase business-value-carousel h-[520px] md:h-[680px]">
          <BusinessValueCarousel />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="bg-black px-5 py-28 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="How it works" title="A simpler operating layer between the customer and the owner." />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {workflow.map(([step, title, body]) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-7">
              <span className="font-mono text-xs font-bold text-orange-300">{step}</span>
              <h3 className="mt-10 text-2xl font-bold tracking-tight">{title}</h3>
              <p className="mt-4 leading-7 text-white/60">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Industries() {
  return (
    <section id="industries" className="bg-[#050505] px-5 py-28 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Industries" title="Designed for real small-business operations." />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {industries.map(([title, body]) => (
            <article key={title} className="rounded-[1.75rem] border border-white/10 bg-black/55 p-7">
              <div className="mb-10 h-24 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,106,0,.28),rgba(255,255,255,.04))]" />
              <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
              <p className="mt-4 leading-7 text-white/60">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OnboardingDemo() {
  return (
    <section id="onboarding-demo" className="bg-black px-5 py-28 text-white md:px-10">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">Product demo</p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Demo of Onboarding
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/62">
            See how DSPATCH transforms a small business into an enterprise-level operating system.
          </p>
          <a
            href="/onboarding"
            className="mt-8 inline-flex rounded-full bg-orange-500 px-7 py-3 text-sm font-bold text-black transition hover:bg-orange-300"
          >
            View Demo
          </a>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-white/10 bg-[#070707] p-5 shadow-2xl shadow-black/60">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_64%_18%,rgba(255,106,0,.18),transparent_34%)]" />
          <div className="relative flex h-full flex-col rounded-lg border border-white/10 bg-black/70">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">DSPATCH Setup</p>
                <h3 className="mt-2 text-xl font-black">Choose your business type</h3>
              </div>
              <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">Step 1 of 8</span>
            </div>

            <div className="grid flex-1 gap-5 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {["Home Services", "Hospitality", "Retail"].map((type, index) => (
                  <div
                    key={type}
                    className={index === 0 ? "rounded-lg border border-orange-300/30 bg-orange-500/15 p-4" : "rounded-lg border border-white/10 bg-white/[0.04] p-4"}
                  >
                    <div className="mb-8 h-10 w-10 rounded-full border border-white/10 bg-black" />
                    <p className={index === 0 ? "text-sm font-bold text-orange-100" : "text-sm font-bold text-white/68"}>{type}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/38">Generated workflow</span>
                  <span className="text-xs font-bold text-orange-300">Preview</span>
                </div>
                {["Booking flow", "Emergency ticket routing", "Customer support playbook"].map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-md border border-white/10 bg-black px-4 py-3">
                    <span className="text-sm font-semibold text-white/72">{item}</span>
                    <span className="h-2 w-16 rounded-full bg-orange-500/70" />
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/32">Presentation demo</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((dot) => (
                    <span key={dot} className={dot === 0 ? "h-2 w-6 rounded-full bg-orange-500" : "h-2 w-2 rounded-full bg-white/18"} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionControl() {
  return (
    <section id="mission" className="bg-black px-5 py-28 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Mission Control" title="The dashboard will become the operational source of truth." />
        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.055] p-5 md:p-7">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-3xl border border-white/10 bg-black/55 p-5">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-xl font-bold">Emergency Queue</h3>
                <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-bold text-orange-200">Live preview</span>
              </div>
              <div className="grid gap-3">
                {[
                  ["Emergency Service", "Basement flooding", "High", "Immediate callback"],
                  ["Appointment Request", "Water heater install", "Medium", "Schedule visit"],
                  ["Quote Request", "Drain cleaning", "Low", "AI answered"],
                ].map(([type, issue, priority, action]) => (
                  <div key={issue} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_1fr_90px_160px]">
                    <span className="font-semibold">{type}</span>
                    <span className="text-white/62">{issue}</span>
                    <span className={priority === "High" ? "font-bold text-orange-300" : "text-white/62"}>{priority}</span>
                    <span className="text-white/62">{action}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <Metric label="Calls recovered" value="47" />
              <Metric label="Average response" value="04s" />
              <Metric label="Revenue protected" value="$18.4k" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/55 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/38">{label}</p>
      <p className="mt-5 text-4xl font-black">{value}</p>
    </div>
  );
}

function CTA() {
  return (
    <section id="cta" className="bg-[#050505] px-5 py-28 text-white md:px-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-orange-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,.24),transparent_40%),rgba(255,255,255,.055)] p-8 text-center md:p-14">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-200">DSPatch</p>
        <h2 className="mt-5 text-4xl font-black leading-tight md:text-6xl">A cleaner foundation for the redesign.</h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/62">
          The page is now static apart from the Spline scene, so the next design pass can rebuild motion intentionally.
        </p>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-300">{eyebrow}</p>
      <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">{title}</h2>
    </div>
  );
}

export default function App() {
  return (
    <main className="min-h-screen bg-black">
      <Nav />
      <Hero />
      <HowItWorks />
      <Industries />
      <OnboardingDemo />
      <Operators />
      <MissionControl />
      <CTA />
    </main>
  );
}
