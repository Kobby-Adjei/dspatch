const splineUrl = 'https://my.spline.design/webdiagram-78ofgCvL78UwRylv2OO3z6iN/';

const HEADLINE = 'Enterprise customer support. Half the cost. Set up in minutes.';

const problemPoints = [
  {
    title: 'Missed calls',
    detail: "Every unanswered call is a customer who called your competitor next.",
  },
  {
    title: 'Tickets falling through',
    detail: "Emails get buried. Issues get forgotten. Customers leave reviews you didn't deserve.",
  },
  {
    title: "Tools you can't afford",
    detail: "Zendesk is $55/seat. Salesforce is $150/seat. None of them were built for your size.",
  },
];

const solutionSteps = [
  {
    step: 'Step 01',
    title: 'Tell us about your business',
    detail: 'Your hours, services, FAQs. 10 minutes. No technical knowledge needed.',
  },
  {
    step: 'Step 02',
    title: 'AI handles your customers',
    detail: 'Answers calls, responds to messages, creates tickets, routes issues. 24/7.',
  },
  {
    step: 'Step 03',
    title: 'A real person has your back',
    detail: 'A Dspatch-trained grad manages your system and catches what AI misses.',
  },
];

const gradBenefits = [
  {
    title: 'Real experience',
    detail: 'Manage live AI systems for real businesses. Goes on your resume and means something.',
  },
  {
    title: 'Flexible work',
    detail: 'Remote, set your hours, manage multiple clients. Built for people building a career.',
  },
  {
    title: 'Built-in network',
    detail: 'Join a growing community of Dspatch operators across Michigan and beyond.',
  },
];

const stats = [
  { raw: 900000, prefix: '', suffix: '+', label: 'small businesses in Michigan' },
  { raw: 0,      prefix: '$', suffix: '', label: 'to get started'              },
  { raw: 10,     prefix: '', suffix: ' mins', label: 'average setup time'      },
];

/* ── Typewriter ── */
function Typewriter({ text, speed = 28, delay = 300, onDone }) {
  const [displayed, setDisplayed] = React.useState('');
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let i = 0;
    let intervalId;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(intervalId);
          setDone(true);
          if (onDone) onDone();
        }
      }, speed);
    }, delay);
    return () => { clearTimeout(timeoutId); clearInterval(intervalId); };
  }, [text, speed, delay, onDone]);

  return (
    <>
      {displayed}
      {!done && <span className="cursor" aria-hidden="true" />}
    </>
  );
}

/* ── Count-up stat card ── */
function CountUp({ raw, prefix = '', suffix = '', label }) {
  const ref = React.useRef(null);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (raw === 0) return;
      const duration = 1600;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        setCount(Math.floor(eased * raw));
        if (p < 1) requestAnimationFrame(tick);
        else setCount(raw);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [raw]);

  const display = prefix + (count >= 1000 ? count.toLocaleString() : count) + suffix;

  return (
    <article className="stat-card reveal" ref={ref}>
      <strong>{display}</strong>
      <span>{label}</span>
    </article>
  );
}

/* ── Scroll reveal ── */
function useScrollReveal() {
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    const timeout = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    }, 100);
    return () => { clearTimeout(timeout); observer.disconnect(); };
  }, []);
}

/* ── Waitlist form ── */
function WaitlistForm({ audience, onClose }) {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <div className="form-topline">
        <label htmlFor={`waitlist-email-${audience}`}>Email</label>
        <button type="button" onClick={onClose} aria-label="Close">Close</button>
      </div>
      <div className="waitlist-row">
        <input
          id={`waitlist-email-${audience}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <button type="submit">Claim your spot</button>
      </div>
      <p className="form-note">
        {submitted
          ? 'You are on the list.'
          : audience === 'business'
          ? 'Business early access waitlist.'
          : 'Dspatch operator network waitlist.'}
      </p>
    </form>
  );
}

/* ── Audience CTAs ── */
function AudienceCtas({ activeForm, setActiveForm, compact = false }) {
  return (
    <div className={compact ? 'cta-stack compact' : 'cta-stack'}>
      <div className="cta-row">
        <button className="primary-action" type="button" onClick={() => setActiveForm('business')}>
          I'm a Business — Get Early Access
        </button>
        <button className="secondary-action" type="button" onClick={() => setActiveForm('grad')}>
          I'm a Recent Grad — Join the Network
        </button>
      </div>
      {activeForm && <WaitlistForm audience={activeForm} onClose={() => setActiveForm(null)} />}
    </div>
  );
}

/* ── App ── */
function App() {
  const [heroReady, setHeroReady] = React.useState(false);
  const [activeForm, setActiveForm] = React.useState(null);
  const [gradForm, setGradForm] = React.useState(false);
  const [finalForm, setFinalForm] = React.useState(null);

  useScrollReveal();

  return (
    <main className="site-shell">

      {/* HERO */}
      <section className="hero-section" aria-labelledby="hero-title">
        <iframe
          className="spline-background"
          title="Dspatch AI support system background"
          src={splineUrl}
          loading="eager"
          allow="autoplay; fullscreen; xr-spatial-tracking"
        />
        <div className="hero-fade" aria-hidden="true" />

        <nav className="topbar" aria-label="Primary">
          <a className="brand" href="#top" aria-label="Dspatch home">
            <span className="brand-mark">D</span>
            <span>Dspatch</span>
          </a>
          <div className="nav-links">
            <a href="#businesses">Businesses</a>
            <a href="#graduates">Graduates</a>
            <a href="#waitlist">Waitlist</a>
          </div>
        </nav>

        <div className="hero-content" id="top">
          <div className="hero-copy-left">
            <p className="eyebrow anim-fade-in">AI-powered support for small teams</p>
            <h1 id="hero-title">
              <Typewriter text={HEADLINE} onDone={() => setHeroReady(true)} />
            </h1>
          </div>
          <div className={`hero-copy-right${heroReady ? ' ready' : ''}`}>
            <p className="hero-lede">
              Dspatch gives small businesses a full AI-powered support system —
              calls answered, tickets routed, customers never lost.
            </p>
            <AudienceCtas activeForm={activeForm} setActiveForm={setActiveForm} />
            <p className="small-proof">Free to start. No credit card. Built in Michigan.</p>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="flat-section" id="businesses" aria-labelledby="problem-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">For small businesses &amp; startups</p>
          <h2 id="problem-title">You're losing customers you don't even know about.</h2>
        </div>
        <div className="three-grid">
          {problemPoints.map((point, i) => (
            <article className={`flat-card reveal d${i + 1}`} key={point.title}>
              <h3>{point.title}</h3>
              <p>{point.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="flat-section solution-section" aria-labelledby="solution-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">How Dspatch works</p>
          <h2 id="solution-title">Set up in minutes. Running forever.</h2>
        </div>
        <div className="step-grid">
          {solutionSteps.map((item, i) => (
            <article className={`step-card reveal d${i + 1}`} key={item.title}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
        <aside className="pricing-callout reveal d2">
          Starting at $29/month vs $150+/month for enterprise tools. That's it.
        </aside>
      </section>

      {/* GRADUATES */}
      <section className="flat-section grad-section" id="graduates" aria-labelledby="grad-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">For recent graduates</p>
          <h2 id="grad-title">Turn your AI skills into real income.</h2>
          <p>
            Dspatch trains recent grads to manage AI-powered support systems for local
            businesses. Flexible paid work. A human in the loop.
          </p>
        </div>
        <div className="three-grid">
          {gradBenefits.map((benefit, i) => (
            <article className={`flat-card reveal d${i + 1}`} key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.detail}</p>
            </article>
          ))}
        </div>
        <button className="primary-action dark-button reveal d2" type="button" onClick={() => setGradForm(true)}>
          Apply to Become a Dspatch Operator
        </button>
        {gradForm && <WaitlistForm audience="grad" onClose={() => setGradForm(false)} />}
      </section>

      {/* PROOF */}
      <section className="flat-section proof-section" aria-labelledby="proof-title">
        <div className="section-heading centered reveal">
          <h2 id="proof-title">Built for Michigan. Ready for everywhere.</h2>
          <p>
            Started at HackMichigan 2026. One mission — enterprise-grade support
            for every small business, real opportunity for the next generation.
          </p>
        </div>
        <div className="stat-grid">
          {stats.map((stat) => (
            <CountUp key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta reveal" id="waitlist" aria-labelledby="final-title">
        <div>
          <h2 id="final-title">Ready to stop missing customers?</h2>
          <p>Join the waitlist. Be first when we launch.</p>
        </div>
        <AudienceCtas activeForm={finalForm} setActiveForm={setFinalForm} compact />
        <p className="small-proof">
          Free to start · No credit card · Built at HackMichigan 2026 · Powered by IBM watsonx &amp; Google
        </p>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>Dspatch · Built in Michigan · HackMichigan 2026</p>
        <p>Powered by IBM watsonx · Google Gemini · Twilio</p>
        <nav aria-label="Footer">
          <a href="#waitlist">Waitlist</a>
          <a href="https://github.com/Kobby-Adjei/dspatch">GitHub</a>
          <a href="mailto:hello@dspatch.ai">Contact</a>
        </nav>
      </footer>

    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
