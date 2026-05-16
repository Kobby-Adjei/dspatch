/* ── Config from URL params ── */
const params  = new URLSearchParams(location.search);
const DEFAULT_BIZ = params.get("biz") || "detroit-plumbing-co";
const DEFAULT_API = params.get("api") || "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud";
const POLL_MS = 5000;

/* ── Helpers ── */
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function urgencyOrder(u) {
  return { emergency: 0, urgent: 1, high: 1, medium: 2, low: 3 }[u] ?? 2;
}

/* ── TicketCard ── */
function TicketCard({ ticket, onResolve, onProgress }) {
  const [busy, setBusy] = React.useState(false);

  const urgency  = ticket.urgency  || "medium";
  const channel  = ticket.channel  || "sms";
  const status   = ticket.status   || "open";
  const created  = ticket.created_at ? timeAgo(ticket.created_at) : "—";
  const phone    = ticket.customer_phone || "unknown";
  const summary  = ticket.issue_summary  || ticket.raw_message || "(no description)";
  const action   = ticket.suggested_action || "";

  const isEmergency = urgency === "emergency";
  const isDone      = status === "resolved";

  async function handleResolve() {
    setBusy(true);
    try { await onResolve(ticket.id || ticket._id); }
    finally { setBusy(false); }
  }

  async function handleProgress() {
    setBusy(true);
    try { await onProgress(ticket.id || ticket._id); }
    finally { setBusy(false); }
  }

  return (
    <article className={`ticket-card ${isEmergency && !isDone ? "emergency" : ""}`}>
      <div className="ticket-top">
        <span className={`badge ${urgency}`}>{urgency}</span>
        <span className="channel-badge">{channel === "voice" ? "📞 Voice" : "💬 SMS"}</span>
      </div>
      <div className="ticket-body">
        <p className="ticket-summary">{summary}</p>
        <div className="ticket-meta">
          <span className="meta-item"><strong>{phone}</strong></span>
          <span className="meta-item">{created}</span>
          <span className="meta-item">#{(ticket.id || ticket._id || "").slice(0, 8)}</span>
          {ticket.ticket_type && (
            <span className="meta-item">{ticket.ticket_type}</span>
          )}
        </div>
      </div>
      <div className="ticket-action-row">
        {isDone ? (
          <span className={`action-hint green`}>Resolved</span>
        ) : (
          <span className="action-hint">{action}</span>
        )}
        {!isDone && (
          <>
            {status !== "in_progress" && (
              <button className="btn-sm" onClick={handleProgress} disabled={busy}>
                In Progress
              </button>
            )}
            <button className="btn-sm green" onClick={handleResolve} disabled={busy}>
              Resolve
            </button>
          </>
        )}
      </div>
    </article>
  );
}

/* ── Section ── */
function Section({ title, tickets, colorClass, onResolve, onProgress }) {
  if (tickets.length === 0) return null;
  return (
    <section>
      <div className="section-header">
        <span className="section-title" style={{ color: colorClass === "red" ? "var(--signal)" : colorClass === "warn" ? "var(--warn)" : colorClass === "blue" ? "var(--blue)" : "var(--muted)" }}>
          {title}
        </span>
        <span className={`section-count ${colorClass}`}>{tickets.length}</span>
      </div>
      <div className="ticket-grid">
        {tickets.map((t) => (
          <TicketCard
            key={t.id || t._id}
            ticket={t}
            onResolve={onResolve}
            onProgress={onProgress}
          />
        ))}
      </div>
    </section>
  );
}

/* ── App ── */
function App() {
  const [bizId,    setBizId]    = React.useState(DEFAULT_BIZ);
  const [apiBase,  setApiBase]  = React.useState(DEFAULT_API);
  const [activeBiz, setActiveBiz] = React.useState(DEFAULT_BIZ);
  const [activeApi, setActiveApi] = React.useState(DEFAULT_API);

  const [tickets,   setTickets]   = React.useState([]);
  const [filter,    setFilter]    = React.useState("open");
  const [lastSync,  setLastSync]  = React.useState(null);
  const [loading,   setLoading]   = React.useState(false);
  const [error,     setError]     = React.useState(null);

  const fetchTickets = React.useCallback(async (biz, api) => {
    try {
      const qs  = filter && filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${api}/businesses/${biz}/tickets${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  /* Initial load + polling */
  React.useEffect(() => {
    setLoading(true);
    fetchTickets(activeBiz, activeApi);
    const id = setInterval(() => fetchTickets(activeBiz, activeApi), POLL_MS);
    return () => clearInterval(id);
  }, [activeBiz, activeApi, fetchTickets]);

  function handleLoad(e) {
    e.preventDefault();
    setActiveBiz(bizId.trim() || DEFAULT_BIZ);
    setActiveApi(apiBase.trim() || DEFAULT_API);
  }

  async function resolveTicket(ticketId) {
    await fetch(`${activeApi}/tickets/${ticketId}/resolve`, { method: "POST" });
    fetchTickets(activeBiz, activeApi);
  }

  async function progressTicket(ticketId) {
    await fetch(`${activeApi}/tickets/${ticketId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: "in_progress" }),
    });
    fetchTickets(activeBiz, activeApi);
  }

  /* ── Sort + bucket ── */
  const sorted = [...tickets].sort((a, b) => urgencyOrder(a.urgency) - urgencyOrder(b.urgency));

  const emergencies = sorted.filter((t) => t.urgency === "emergency");
  const urgent      = sorted.filter((t) => ["urgent", "high"].includes(t.urgency));
  const medium      = sorted.filter((t) => t.urgency === "medium" || !t.urgency);
  const low         = sorted.filter((t) => t.urgency === "low");

  const resolvedToday = tickets.filter((t) => {
    if (t.status !== "resolved") return false;
    if (!t.resolved_at && !t.updated_at) return true;
    const d = new Date(t.resolved_at || t.updated_at);
    return Date.now() - d.getTime() < 86400000;
  }).length;

  const openCount = tickets.filter((t) => t.status !== "resolved").length;

  return (
    <div className="shell">

      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">D</div>
          <span>DSPatch</span>
          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>Command Center</span>
        </div>
        <div className="topbar-right">
          <div className="pulse-dot" />
          <span className="live-label">Live</span>
          <span className="refresh-label">
            {lastSync ? `Updated ${timeAgo(lastSync.toISOString())}` : "Loading…"}
          </span>
        </div>
      </header>

      {/* ── Business bar ── */}
      <form className="biz-bar" onSubmit={handleLoad}>
        <span className="biz-label">Business</span>
        <input
          className="biz-input"
          value={bizId}
          onChange={(e) => setBizId(e.target.value)}
          placeholder="business-id"
        />
        <span className="biz-label" style={{ marginLeft: 8 }}>API</span>
        <input
          className="api-input"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          placeholder="https://..."
        />
        <button className="load-btn" type="submit">Load</button>

        {/* Filter buttons */}
        <div className="filter-bar" style={{ marginLeft: "auto" }}>
          {["open", "in_progress", "resolved", "all"].map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>
      </form>

      {/* ── Stats strip ── */}
      <div className="stats-strip">
        <div className="stat-item">
          <span className={`stat-num ${emergencies.length > 0 ? "red" : "white"}`}>{emergencies.length}</span>
          <span className="stat-desc">Emergencies</span>
        </div>
        <div className="stat-item">
          <span className={`stat-num ${urgent.length > 0 ? "warn" : "white"}`}>{urgent.length}</span>
          <span className="stat-desc">Urgent</span>
        </div>
        <div className="stat-item">
          <span className="stat-num white">{openCount}</span>
          <span className="stat-desc">Open</span>
        </div>
        <div className="stat-item">
          <span className="stat-num green">{resolvedToday}</span>
          <span className="stat-desc">Resolved today</span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="content">
        {loading && tickets.length === 0 && (
          <p style={{ color: "var(--muted)", textAlign: "center", paddingTop: 32 }}>Loading tickets…</p>
        )}

        {error && (
          <p className="status-bar error">Error: {error} — check your business ID and API URL</p>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="empty">
            No tickets found for <strong>{activeBiz}</strong>
            {filter !== "all" && <> with status <strong>{filter}</strong></>}.
            <br />
            SMS or call the business number to generate one.
          </div>
        )}

        <Section title="Emergency" tickets={emergencies} colorClass="red"  onResolve={resolveTicket} onProgress={progressTicket} />
        <Section title="Urgent"    tickets={urgent}      colorClass="warn" onResolve={resolveTicket} onProgress={progressTicket} />
        <Section title="Standard"  tickets={medium}      colorClass="blue" onResolve={resolveTicket} onProgress={progressTicket} />
        <Section title="Low"       tickets={low}         colorClass="muted" onResolve={resolveTicket} onProgress={progressTicket} />
      </div>

    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
