const splineUrl = 'https://my.spline.design/webdiagram-78ofgCvL78UwRylv2OO3z6iN/';

const HEADLINE = 'Never lose a customer because nobody answered.';

const problems = [
  { title: 'Missed calls',        detail: 'Every unanswered call is a job that went to your competitor.' },
  { title: 'Buried requests',     detail: 'Texts, emails, voicemails — scattered with no system to catch them.' },
  { title: 'No urgency filter',   detail: 'A flooded basement and an hours inquiry look the same in your inbox.' },
];

const howSteps = [
  {
    step: '01',
    title: 'AI answers immediately',
    detail: 'Every call, text, and message gets a response — 24/7. No missed windows.',
  },
  {
    step: '02',
    title: 'Collects and classifies',
    detail: 'AI extracts structured info, detects urgency, and creates an operational record.',
  },
  {
    step: '03',
    title: 'Your dashboard updates live',
    detail: 'Emergency queue, appointments, orders — your command center reflects reality in real time.',
  },
];

const industries = [
  {
    name: 'Home Services',
    sub: 'Plumbing · HVAC · Electrical · Auto Repair',
    modules: ['Emergency Queue', 'Appointment Requests', 'Customer Timeline', 'Revenue Recovery'],
    feel: 'AI-powered dispatch center',
  },
  {
    name: 'Hospitality & Food',
    sub: 'Restaurants · Cafes · Bakeries',
    modules: ['Reservations Queue', 'Active Orders', 'Complaint Resolution', 'Peak Demand Analytics'],
    feel: 'AI front desk + order management',
  },
  {
    name: 'Retail',
    sub: 'Local Shops · Boutiques · Beauty Supply',
    modules: ['Orders Queue', 'Product Demand Insights', 'Returns & Exchanges', 'Sales Opportunity Alerts'],
    feel: 'AI-powered retail operations center',
  },
];

const stats = [
  { raw: 900000, prefix: '', suffix: '+', label: 'small businesses in Michigan'  },
  { raw: 0,      prefix: '$', suffix: '', label: 'to get started'                },
  { raw: 10,     prefix: '', suffix: ' mins', label: 'average setup time'        },
];

/* ── Typewriter ── */
function Typewriter({ text, speed = 28, delay = 300, onDone }) {
  const [displayed, setDisplayed] = React.useState('');
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let i = 0, intervalId;
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
        if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    const tid = setTimeout(() => {
      document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    }, 100);
    return () => { clearTimeout(tid); observer.disconnect(); };
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
        <label htmlFor={`waitlist-${audience}`}>Email</label>
        <button type="button" onClick={onClose}>Close</button>
      </div>
      <div className="waitlist-row">
        <input
          id={`waitlist-${audience}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <button type="submit">Reserve my spot</button>
      </div>
      <p className="form-note">
        {submitted ? 'You are on the list.' : audience === 'business' ? 'Business early access waitlist.' : 'Operator network waitlist.'}
      </p>
    </form>
  );
}

/* ── App ── */
function App() {
  const [heroReady, setHeroReady] = React.useState(false);
  const [heroForm, setHeroForm]   = React.useState(null);
  const [finalForm, setFinalForm] = React.useState(null);

  useScrollReveal();

  return (
    <main className="site-shell">

      {/* ── HERO ── */}
      <section className="hero-section" aria-labelledby="hero-title">
        <iframe
          className="spline-background"
          title="Dspatch AI operations background"
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
            <a href="#how-it-works">How it works</a>
            <a href="#industries">Industries</a>
            <a href="#waitlist">Get access</a>
          </div>
        </nav>

        <div className="hero-content" id="top">
          <div className="hero-copy-left">
            <p className="eyebrow anim-fade-in">AI-powered customer operations</p>
            <h1 id="hero-title">
              <Typewriter text={HEADLINE} onDone={() => setHeroReady(true)} />
            </h1>
          </div>
          <div className={`hero-copy-right${heroReady ? ' ready' : ''}`}>
            <p className="hero-lede">
              DSPatch is the AI operations layer that intakes every customer request,
              detects urgency, and updates your command center — before you pick up the phone.
            </p>
            <div className="cta-stack">
              <div className="cta-row">
                <button className="primary-action" type="button" onClick={() => setHeroForm('business')}>
                  Get Early Access
                </button>
                <a className="secondary-action" href="#demo">
                  See it in action
                </a>
              </div>
              {heroForm && <WaitlistForm audience={heroForm} onClose={() => setHeroForm(null)} />}
            </div>
            <p className="small-proof">Free to start · No credit card · Built in Michigan</p>
          </div>
        </div>
      </section>

      {/* ── POSITIONING ── */}
      <section className="positioning-section" aria-label="What DSPatch is">
        <div className="flat-section">
          <div className="not-list reveal">
            <span>Not a chatbot.</span>
            <span>Not a helpdesk.</span>
            <span>Not an AI receptionist.</span>
          </div>
          <p className="is-statement reveal d2">
            An AI-powered customer operations layer — intake, classify, dispatch.
          </p>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="flat-section problem-section" aria-labelledby="problem-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">The problem</p>
          <h2 id="problem-title">You're losing revenue you can't even see.</h2>
        </div>
        <div className="three-grid">
          {problems.map((p, i) => (
            <article className={`flat-card reveal d${i + 1}`} key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="flat-section solution-section" id="how-it-works" aria-labelledby="how-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">How it works</p>
          <h2 id="how-title">Intake. Classify. Dispatch.</h2>
        </div>
        <div className="step-grid">
          {howSteps.map((item, i) => (
            <article className={`step-card reveal d${i + 1}`} key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── DEMO MOMENT ── */}
      <section className="flat-section demo-section" id="demo" aria-labelledby="demo-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">Live example</p>
          <h2 id="demo-title">From customer message to action — in seconds.</h2>
        </div>
        <div className="demo-grid reveal d1">
          <div className="demo-card sms-card">
            <p className="demo-label">Customer texts</p>
            <p className="sms-text">"My basement is flooding."</p>
          </div>
          <div className="demo-arrow" aria-hidden="true">→</div>
          <div className="demo-card ai-card">
            <p className="demo-label">DSPatch AI extracts</p>
            <div className="ai-fields">
              <div className="ai-field"><span>Issue type</span><strong>Water leak</strong></div>
              <div className="ai-field"><span>Urgency</span><strong className="urgent">Emergency</strong></div>
              <div className="ai-field"><span>Action</span><strong>Immediate callback</strong></div>
            </div>
          </div>
          <div className="demo-arrow" aria-hidden="true">→</div>
          <div className="demo-card ticket-card">
            <p className="demo-label">Dashboard updates</p>
            <div className="ticket-badge">EMERGENCY</div>
            <p className="ticket-title">Water Leak — 123 Main St</p>
            <p className="ticket-sub">Assigned · Callback requested · 2 sec ago</p>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section className="flat-section industries-section" id="industries" aria-labelledby="industries-title">
        <div className="section-heading reveal fade-left">
          <p className="eyebrow dark">Built for your industry</p>
          <h2 id="industries-title">The dashboard changes. The result doesn't.</h2>
          <p>DSPatch is not generic software. Your command center is built for your business type.</p>
        </div>
        <div className="industry-grid">
          {industries.map((ind, i) => (
            <article className={`industry-card reveal d${i + 1}`} key={ind.name}>
              <div className="industry-header">
                <h3>{ind.name}</h3>
                <p className="industry-sub">{ind.sub}</p>
              </div>
              <ul className="industry-modules">
                {ind.modules.map((mod) => (
                  <li key={mod}>{mod}</li>
                ))}
              </ul>
              <p className="industry-feel">Feels like: <em>{ind.feel}</em></p>
            </article>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="flat-section proof-section" aria-labelledby="proof-title">
        <div className="section-heading centered reveal">
          <h2 id="proof-title">Built for Michigan. Ready for everywhere.</h2>
          <p>Started at HackMichigan 2026. One mission — make operations-grade AI accessible to every small business.</p>
        </div>
        <div className="stat-grid">
          {stats.map((s) => <CountUp key={s.label} {...s} />)}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="final-cta reveal" id="waitlist" aria-labelledby="final-title">
        <h2 id="final-title">Stop losing customers to a missed call.</h2>
        <p>Join the waitlist. Be first when we launch.</p>
        <div className="cta-stack compact">
          <div className="cta-row">
            <button className="primary-action" type="button" onClick={() => setFinalForm('business')}>
              I'm a Business — Get Early Access
            </button>
            <button className="secondary-action" type="button" onClick={() => setFinalForm('grad')}>
              I'm a Recent Grad — Join the Network
            </button>
          </div>
          {finalForm && <WaitlistForm audience={finalForm} onClose={() => setFinalForm(null)} />}
        </div>
        <p className="small-proof">Free to start · No credit card · Built at HackMichigan 2026 · Powered by IBM watsonx &amp; Google</p>
      </section>

      {/* ── FOOTER ── */}
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
