import Link from "next/link";

export default function OnboardingCTA() {
  return (
    <section id="cta" className="bg-[#050505] px-5 py-28 text-white md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="rounded-[2rem] border border-orange-300/25 bg-[radial-gradient(circle_at_50%_0%,rgba(255,106,0,.24),transparent_40%),rgba(255,255,255,.055)] px-8 py-16 md:px-14 md:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-200">
            Get started
          </p>
          <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight md:text-5xl">
            Set up your AI agent<br />in 2 minutes.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/50">
            Pick your industry, create your account, choose what your AI handles — and you're live.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/onboard"
              className="w-full rounded-full bg-white px-8 py-4 text-sm font-black text-black transition-all duration-150 hover:bg-orange-50 active:scale-[0.98] sm:w-auto"
            >
              Sign up free →
            </Link>
            <Link
              href="/login"
              className="w-full rounded-full border border-white/15 px-8 py-4 text-sm font-semibold text-white/60 transition-all duration-150 hover:border-white/30 hover:text-white active:scale-[0.98] sm:w-auto"
            >
              Log in
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/28">
            Free to start · No credit card · Your number is provisioned instantly
          </p>
        </div>
      </div>
    </section>
  );
}
