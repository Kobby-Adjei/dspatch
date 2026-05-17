"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, saveAuth, clearAuth, authHeaders } from "../lib/auth";

const POLL_MS  = 5000;
const API_BASE = process.env.NEXT_PUBLIC_API_URL ||
  "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud";

function timeAgo(iso) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function urgencyRank(u) {
  return { emergency: 0, urgent: 1, high: 1, medium: 2, low: 3 }[u] ?? 2;
}

function getBizId() {
  const auth = getAuth();
  return auth?.business?.id || "";
}

function formatId(id) {
  return id ? `#${String(id).slice(-6).toUpperCase()}` : "—";
}

/* ── icons ── */
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconChart = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 13V8M6 13V5M10 13V9M14 13V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconBook = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M3 2h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M5 5h4M5 7.5h4M5 10h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconPlug = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M6 1v3M10 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M4 4h8v3a4 4 0 0 1-8 0V4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M8 11v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconHelp = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M6.2 6.2C6.2 5.1 7 4.5 8 4.5s1.8.6 1.8 1.7c0 .9-.6 1.3-1.4 1.8C7.8 8.3 7.5 8.7 7.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="7.5" cy="11.5" r=".6" fill="currentColor"/>
  </svg>
);
const IconTicketStat = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M7 10h6M7 7h4M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 3 14.5v-9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconFire = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path d="M10 2c0 4-5 5-5 9a5 5 0 0 0 10 0c0-2.5-2-4-2-6-1.5 1.5-1.5 3-3 3C10 8 10 2 10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M6.5 10.5l2.5 2.5 4-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

/* ── Toast ── */
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold shadow-2xl transition-all ${
      type === "error"
        ? "bg-red-500/90 text-white"
        : "bg-[#1a1a1a] text-white"
    }`}>
      {type === "error" ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.3"/><path d="M7 4v3.5M7 9.5v.5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#22c55e" strokeWidth="1.3"/><path d="M4.5 7l2 2 3-3" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      {message}
    </div>
  );
}

/* ── Nav item ── */
function NavItem({ icon, label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-[#f97316] text-white"
          : "text-[#555] hover:bg-[#1c1c1c] hover:text-[#999]"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge != null && (
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${active ? "bg-white/20 text-white" : "bg-[#222] text-[#555]"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, sub, icon, hot }) {
  return (
    <div className="flex items-start justify-between rounded-2xl bg-[#141414] px-5 pt-5 pb-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#555]">{label}</p>
        <p className={`mt-2 text-[2.1rem] font-black leading-none tabular-nums ${hot ? "text-[#f97316]" : "text-white"}`}>
          {value}
        </p>
        {sub && <p className="mt-2 text-[10px] text-[#444]">{sub}</p>}
      </div>
      <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${hot ? "bg-[#f97316]/15 text-[#f97316]" : "bg-[#1f1f1f] text-[#444]"}`}>
        {icon}
      </div>
    </div>
  );
}

/* ── Urgency ── */
function UrgencyCell({ urgency }) {
  const map = {
    emergency: { dot: "bg-red-500",    text: "text-red-400",    label: "Emergency" },
    urgent:    { dot: "bg-orange-500", text: "text-orange-400", label: "Urgent"    },
    high:      { dot: "bg-orange-500", text: "text-orange-400", label: "Urgent"    },
    medium:    { dot: "bg-blue-500",   text: "text-blue-400",   label: "Standard"  },
    low:       { dot: "bg-[#333]",     text: "text-[#555]",     label: "Low"       },
  };
  const cfg = map[urgency] || map.medium;
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cfg.dot}`} />
      <span className={`text-[11px] font-semibold ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const styles = {
    open:        "bg-[#f97316]/12 text-[#f97316]",
    in_progress: "bg-blue-500/12 text-blue-400",
    resolved:    "bg-[#1f1f1f] text-[#444]",
  };
  const labels = { open: "Open", in_progress: "In progress", resolved: "Resolved" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status] || styles.open}`}>
      {labels[status] || status}
    </span>
  );
}

/* ── Live dot ── */
function LiveDot({ size = "h-2 w-2" }) {
  return (
    <span className={`relative flex flex-shrink-0 ${size}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-50" />
      <span className={`relative inline-flex ${size} rounded-full bg-[#f97316]`} />
    </span>
  );
}

/* ── Mini spinner ── */
function Spinner() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="animate-spin" style={{ animationDuration: "0.75s" }}>
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2"/>
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 20" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Main ── */
export default function CommandCenter() {
  const router = useRouter();
  const [bizId,       setBizId]      = useState("");
  const [bizName,     setBizName]    = useState("");
  const [tickets,     setTickets]    = useState([]);
  const [filter,      setFilter]     = useState("open");
  const [search,      setSearch]     = useState("");
  const [lastSync,    setLastSync]   = useState(null);
  const [booting,     setBooting]    = useState(true);
  const [fetching,    setFetching]   = useState(false);
  const [error,       setError]      = useState(null);
  const [resolving,   setResolving]  = useState(new Set());
  const [progressing, setProgressing]= useState(new Set());
  const [navActive,   setNavActive]  = useState("tickets");
  const [toast,       setToast]      = useState(null);

  /* knowledge base */
  const [chunks,      setChunks]     = useState([]);
  const [chunkText,   setChunkText]  = useState("");
  const [sheetsUrl,   setSheetsUrl]  = useState("");
  const [kbLoading,   setKbLoading]  = useState(false);
  const [kbSaving,    setKbSaving]   = useState(false);

  /* settings */
  const [alertPhone,   setAlertPhone]   = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  /* integrations */
  const [integrations, setIntegrations] = useState({});
  const [zdSubdomain,  setZdSubdomain]  = useState("");
  const [zdEmail,      setZdEmail]      = useState("");
  const [zdKey,        setZdKey]        = useState("");
  const [zdSaving,     setZdSaving]     = useState(false);
  const [intLoading,   setIntLoading]   = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth?.token) { router.replace("/login"); return; }
    setBizId(auth.business?.id || "");
    setBizName(auth.business?.name || "");
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

  const fetchTickets = useCallback(async (biz, opts = {}) => {
    if (!biz) return;
    if (!opts.silent) setFetching(true);
    try {
      const qs  = filter && filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${API_BASE}/businesses/${biz}/tickets${qs}`, {
        headers: authHeaders(),
      });
      if (res.status === 401) { handleLogout(); return; }
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : data.tickets || []);
      setLastSync(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBooting(false);
      setFetching(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!bizId) return;
    setBooting(true);
    fetchTickets(bizId);
    const id = setInterval(() => fetchTickets(bizId, { silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [bizId, fetchTickets]);

  const fetchKnowledge = useCallback(async (biz) => {
    if (!biz) return;
    setKbLoading(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${biz}/knowledge`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) setChunks((await res.json()).chunks || []);
    } catch (e) { showToast(e.message || "Failed to load knowledge base", "error"); }
    finally { setKbLoading(false); }
  }, []);

  const fetchIntegrations = useCallback(async (biz) => {
    if (!biz) return;
    setIntLoading(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${biz}/integrations`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
      if (res.ok) setIntegrations((await res.json()) || {});
    } catch (e) { showToast(e.message || "Failed to load integrations", "error"); }
    finally { setIntLoading(false); }
  }, []);

  useEffect(() => {
    if (!bizId) return;
    if (navActive === "knowledge")    fetchKnowledge(bizId);
    if (navActive === "integrations") fetchIntegrations(bizId);
    if (navActive === "settings") {
      const auth = getAuth();
      setAlertPhone(auth?.business?.alert_phone || "");
    }
  }, [navActive, bizId]);

  async function addChunk() {
    if (!chunkText.trim()) return;
    setKbSaving(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${bizId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text: chunkText.trim(), source: "manual" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      setChunkText("");
      showToast("Knowledge chunk saved");
      fetchKnowledge(bizId);
    } catch (e) { showToast(e.message, "error"); }
    finally { setKbSaving(false); }
  }

  async function deleteChunk(id) {
    try {
      const res = await fetch(`${API_BASE}/knowledge/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Chunk removed");
      setChunks((c) => c.filter((x) => (x.id || x._id) !== id));
    } catch (e) { showToast(e.message, "error"); }
  }

  async function importSheets() {
    if (!sheetsUrl.trim()) return;
    setKbSaving(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${bizId}/integrations/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ url: sheetsUrl.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Import failed");
      const data = await res.json();
      setSheetsUrl("");
      showToast(`Imported ${data.imported ?? 0} chunks from Sheet`);
      fetchKnowledge(bizId);
    } catch (e) { showToast(e.message, "error"); }
    finally { setKbSaving(false); }
  }

  async function connectZendesk() {
    if (!zdSubdomain || !zdEmail || !zdKey) return;
    setZdSaving(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${bizId}/integrations/zendesk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ subdomain: zdSubdomain, admin_email: zdEmail, api_key: zdKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Connection failed");
      showToast("Zendesk connected");
      setZdSubdomain(""); setZdEmail(""); setZdKey("");
      fetchIntegrations(bizId);
    } catch (e) { showToast(e.message, "error"); }
    finally { setZdSaving(false); }
  }

  async function disconnectIntegration(key) {
    try {
      const res = await fetch(`${API_BASE}/businesses/${bizId}/integrations/${key}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Disconnect failed");
      showToast(`${key} disconnected`);
      fetchIntegrations(bizId);
    } catch (e) { showToast(e.message, "error"); }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${bizId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify({ alert_phone: alertPhone.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      const { business } = await res.json();
      const auth = getAuth();
      if (auth) saveAuth(auth.token, business);
      showToast("Settings saved");
    } catch (e) { showToast(e.message, "error"); }
    finally { setSettingsSaving(false); }
  }

  async function resolveTicket(id) {
    if (resolving.has(id)) return;
    setResolving((s) => new Set(s).add(id));
    await new Promise((r) => setTimeout(r, 260));
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}/resolve`, { method: "POST", headers: authHeaders() });
      if (!res.ok) throw new Error(`Resolve failed (${res.status})`);
      showToast("Ticket resolved");
      fetchTickets(bizId, { silent: true });
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setResolving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function progressTicket(id) {
    if (progressing.has(id)) return;
    setProgressing((s) => new Set(s).add(id));
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Update failed (${res.status})`);
      }
      showToast("Moved to in progress");
      fetchTickets(bizId, { silent: true });
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setProgressing((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  /* derived */
  const sorted       = [...tickets].sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency));
  const emergencies  = tickets.filter((t) => t.urgency === "emergency" && t.status !== "resolved");
  const inProgress   = tickets.filter((t) => t.status === "in_progress");
  const openCount    = tickets.filter((t) => t.status !== "resolved").length;
  const resolvedToday = tickets.filter((t) => {
    if (t.status !== "resolved") return false;
    return Date.now() - new Date(t.resolved_at || t.updated_at || 0) < 86400000;
  }).length;

  const displayed = sorted.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (t.issue_summary || "").toLowerCase().includes(q) ||
      (t.customer_phone || "").includes(q) ||
      (t.ticket_type || "").toLowerCase().includes(q)
    );
  });

  const FILTERS = [
    { key: "open",        label: "Open"        },
    { key: "in_progress", label: "In progress" },
    { key: "resolved",    label: "Resolved"    },
    { key: "all",         label: "All"         },
  ];

  const bizInitials = (bizName || bizId).slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a] text-white">

      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}

      {/* ── Sidebar ── */}
      <aside className="hidden w-[210px] flex-shrink-0 flex-col bg-[#111111] lg:flex">
        <div className="px-5 py-5">
          <Link href="/">
            <img src="/dspatch_logo.svg" alt="DSPatch" className="h-9 w-32 object-contain object-left" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-6">
          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.28em] text-[#2e2e2e]">Menu</p>
            <div className="space-y-0.5">
              <NavItem icon={<IconGrid />}  label="Overview"  active={navActive === "overview"}  onClick={() => setNavActive("overview")} />
              <NavItem
                icon={<IconList />}
                label="Tickets"
                active={navActive === "tickets"}
                badge={openCount > 0 ? openCount : undefined}
                onClick={() => setNavActive("tickets")}
              />
              <NavItem icon={<IconChart />} label="Analytics" active={navActive === "analytics"} onClick={() => setNavActive("analytics")} />
              <NavItem icon={<IconBook />}  label="Knowledge" active={navActive === "knowledge"} onClick={() => setNavActive("knowledge")} />
              <NavItem icon={<IconPlug />}  label="Integrations" active={navActive === "integrations"} onClick={() => setNavActive("integrations")} />
            </div>
          </div>
          <div>
            <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[0.28em] text-[#2e2e2e]">General</p>
            <div className="space-y-0.5">
              <NavItem icon={<IconSettings />} label="Settings"  active={navActive === "settings"} onClick={() => setNavActive("settings")} />
              <NavItem icon={<IconHelp />}     label="Help Desk" active={navActive === "help"}     onClick={() => setNavActive("help")} />
            </div>
          </div>
        </nav>

        <div className="px-5 py-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <LiveDot />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f97316]">Live</span>
            <span className="ml-auto text-[10px] tabular-nums text-[#2e2e2e]">
              {lastSync ? timeAgo(lastSync.toISOString()) : "—"}
            </span>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#2a2a2a]">Business</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#555] truncate">{bizName || bizId}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-[#3a3a3a] hover:bg-[#1a1a1a] hover:text-[#666] transition-colors"
          >
            Log out →
          </button>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* top bar */}
        <header className="flex items-center justify-between bg-[#111111] px-6 py-4">
          <Link href="/" className="lg:hidden">
            <img src="/dspatch_logo.svg" alt="DSPatch" className="h-8 w-28 object-contain object-left" />
          </Link>
          <div className="hidden lg:flex items-center gap-3">
            <h1 className="text-lg font-black text-white">Ticket Overview</h1>
            {fetching && !booting && (
              <span className="text-[#444]"><Spinner /></span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]">
                <IconSearch />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tickets…"
                className="w-52 rounded-xl bg-[#1a1a1a] py-2 pl-8 pr-3 text-xs text-[#aaa] placeholder-[#444] outline-none transition-colors focus:bg-[#1f1f1f]"
              />
            </div>

            <div className="flex items-center gap-1.5 lg:hidden">
              <LiveDot size="h-1.5 w-1.5" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f97316]">Live</span>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f97316]/15 text-[10px] font-black text-[#f97316]">
              {bizInitials}
            </div>
          </div>
        </header>

        {/* page */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-5xl space-y-5">

            {/* ── Tickets tab ── */}
            {(navActive === "tickets" || navActive === "overview" || navActive === "analytics") && (<>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Total Tickets"  value={tickets.length}     sub={`${openCount} open`}   icon={<IconTicketStat />} hot={false} />
                <StatCard label="Emergencies"    value={emergencies.length} sub="Active now"            icon={<IconFire />}       hot={emergencies.length > 0} />
                <StatCard label="In Progress"    value={inProgress.length}  sub="Being handled"         icon={<IconClock />}      hot={false} />
                <StatCard label="Resolved Today" value={resolvedToday}      sub="Last 24 h"             icon={<IconCheck />}      hot={false} />
              </div>

              <div className="overflow-hidden rounded-2xl bg-[#111111]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <h2 className="text-base font-black text-white">Recent Tickets</h2>
                  <div className="flex items-center gap-1 rounded-xl bg-[#1a1a1a] p-1">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${
                          filter === f.key ? "bg-[#f97316] text-white" : "text-[#555] hover:text-[#888]"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-3 sm:hidden">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets…"
                    className="w-full rounded-xl bg-[#1a1a1a] px-3 py-2 text-xs text-[#aaa] placeholder-[#444] outline-none" />
                </div>
                <div className="h-px bg-[#1a1a1a]" />
                {booting ? (
                  <div className="flex flex-col items-center gap-4 py-20">
                    <svg width="36" height="36" viewBox="0 0 36 36" className="animate-spin" style={{ animationDuration: "1.1s" }}>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#1f1f1f" strokeWidth="2"/>
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="24 70" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#333]">Loading</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center gap-3 py-16">
                    <p className="text-xs text-red-400/70">{error}</p>
                    <button onClick={() => fetchTickets(bizId)}
                      className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-xs font-semibold text-[#888] hover:bg-[#222] transition-colors">
                      Retry
                    </button>
                  </div>
                ) : displayed.length === 0 ? (
                  <div className="flex flex-col items-center py-20">
                    <p className="text-2xl font-black text-[#1f1f1f]">No tickets</p>
                    <p className="mt-2 text-xs text-[#333]">Call or text your number to create one.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#0f0f0f]">
                          {["Ticket", "Time", "Customer", "Issue", "Urgency", "Status", "Action"].map((h) => (
                            <th key={h} className="whitespace-nowrap px-5 py-3 text-[9px] font-black uppercase tracking-[0.24em] text-[#333]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayed.map((t, i) => {
                          const id       = t.id || t._id || "";
                          const isDone   = t.status === "resolved";
                          const isRes    = resolving.has(id);
                          const isProg   = progressing.has(id);
                          const inProgSt = t.status === "in_progress";
                          return (
                            <tr key={id} className={`transition-all duration-300 hover:bg-[#161616] ${i !== displayed.length - 1 ? "border-b border-[#161616]" : ""} ${isRes ? "opacity-0 scale-[0.98]" : "opacity-100"}`}>
                              <td className="px-5 py-3.5"><span className="font-mono text-xs font-bold text-[#444]">{formatId(id)}</span></td>
                              <td className="whitespace-nowrap px-5 py-3.5"><span className="text-xs text-[#444]">{timeAgo(t.created_at)}</span></td>
                              <td className="px-5 py-3.5">
                                <p className="text-xs font-semibold text-[#aaa]">{t.customer_phone || "Unknown"}</p>
                                <p className="mt-0.5 text-[10px] text-[#444]">{t.channel === "voice" ? "Voice call" : "SMS"}</p>
                              </td>
                              <td className="max-w-[200px] px-5 py-3.5">
                                <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#ccc]">{t.issue_summary || t.raw_message || "—"}</p>
                                {t.ticket_type && <p className="mt-0.5 text-[10px] text-[#444]">{t.ticket_type}</p>}
                              </td>
                              <td className="whitespace-nowrap px-5 py-3.5"><UrgencyCell urgency={t.urgency} /></td>
                              <td className="whitespace-nowrap px-5 py-3.5"><StatusBadge status={t.status} /></td>
                              <td className="whitespace-nowrap px-5 py-3.5">
                                {!isDone ? (
                                  <div className="flex items-center gap-1.5">
                                    {!inProgSt && (
                                      <button onClick={() => progressTicket(id)} disabled={isProg}
                                        className="flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-2.5 py-1.5 text-[10px] font-semibold text-[#555] transition-colors hover:bg-[#222] hover:text-[#888] disabled:opacity-40">
                                        {isProg ? <Spinner /> : null} Progress
                                      </button>
                                    )}
                                    <button onClick={() => resolveTicket(id)} disabled={isRes}
                                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors disabled:opacity-40 ${t.urgency === "emergency" ? "bg-red-500/12 text-red-400 hover:bg-red-500/20" : "bg-[#f97316]/12 text-[#f97316] hover:bg-[#f97316]/20"}`}>
                                      {isRes ? <Spinner /> : null} Resolve
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[#2e2e2e]">Done</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>)}

            {/* ── Knowledge Base tab ── */}
            {navActive === "knowledge" && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-white">Knowledge Base</h2>

                {/* add chunk */}
                <div className="rounded-2xl bg-[#111111] p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#444]">Add Knowledge</p>
                  <textarea
                    value={chunkText}
                    onChange={(e) => setChunkText(e.target.value)}
                    placeholder="Paste product info, FAQs, policies, pricing — any text your AI agent should know…"
                    rows={4}
                    className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-xs text-[#ccc] placeholder-[#444] outline-none resize-none focus:bg-[#1f1f1f] transition-colors"
                  />
                  <button onClick={addChunk} disabled={kbSaving || !chunkText.trim()}
                    className="flex items-center gap-2 rounded-xl bg-[#f97316] px-4 py-2 text-xs font-bold text-white transition-opacity disabled:opacity-40">
                    {kbSaving ? <Spinner /> : null} Save chunk
                  </button>
                </div>

                {/* import from sheets */}
                <div className="rounded-2xl bg-[#111111] p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#444]">Import from Google Sheets</p>
                  <p className="text-[10px] text-[#333]">Paste a published CSV link or a public Google Sheets URL. Each row becomes a knowledge chunk.</p>
                  <div className="flex gap-2">
                    <input value={sheetsUrl} onChange={(e) => setSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/…"
                      className="flex-1 rounded-xl bg-[#1a1a1a] px-4 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:bg-[#1f1f1f] transition-colors" />
                    <button onClick={importSheets} disabled={kbSaving || !sheetsUrl.trim()}
                      className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-[#888] transition-colors hover:bg-[#222] disabled:opacity-40">
                      {kbSaving ? <Spinner /> : null} Import
                    </button>
                  </div>
                </div>

                {/* chunk list */}
                <div className="rounded-2xl bg-[#111111] overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#444]">Stored Chunks ({chunks.length})</p>
                    {kbLoading && <Spinner />}
                  </div>
                  <div className="h-px bg-[#1a1a1a]" />
                  {chunks.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[10px] text-[#333]">No knowledge chunks yet. Add some above.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#1a1a1a]">
                      {chunks.map((c) => {
                        const id = c.id || c._id || "";
                        return (
                          <li key={id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#161616]">
                            <p className="flex-1 text-xs text-[#888] leading-relaxed line-clamp-3">{c.text}</p>
                            <div className="flex flex-shrink-0 flex-col items-end gap-1">
                              {c.source && <span className="text-[9px] text-[#333]">{c.source}</span>}
                              <button onClick={() => deleteChunk(id)}
                                className="text-[10px] text-[#333] hover:text-red-400 transition-colors">
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ── Integrations tab ── */}
            {navActive === "integrations" && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-white">Integrations</h2>

                {/* HubSpot */}
                <div className="rounded-2xl bg-[#111111] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">HubSpot CRM</p>
                      <p className="text-[10px] text-[#444] mt-0.5">Pull contact data and ticket history from HubSpot on every call.</p>
                    </div>
                    {integrations.hubspot?.connected ? (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> Connected
                        </span>
                        <button onClick={() => disconnectIntegration("hubspot")}
                          className="text-[10px] text-[#444] hover:text-red-400 transition-colors">Disconnect</button>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_BASE}/integrations/hubspot/auth`, { headers: authHeaders() });
                            if (!res.ok) throw new Error((await res.json()).error || "Failed");
                            const { auth_url } = await res.json();
                            window.location.href = auth_url;
                          } catch (e) { showToast(e.message, "error"); }
                        }}
                        className="rounded-xl bg-[#f97316] px-4 py-2 text-xs font-bold text-white hover:bg-[#ea6b0e] transition-colors">
                        Connect HubSpot
                      </button>
                    )}
                  </div>
                  {integrations.hubspot?.connected && (
                    <p className="text-[10px] text-[#333]">Portal: {integrations.hubspot.portal_id || "—"}</p>
                  )}
                </div>

                {/* Zendesk */}
                <div className="rounded-2xl bg-[#111111] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Zendesk</p>
                      <p className="text-[10px] text-[#444] mt-0.5">Look up open tickets and customer history from Zendesk.</p>
                    </div>
                    {integrations.zendesk?.connected && (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" /> Connected
                        </span>
                        <button onClick={() => disconnectIntegration("zendesk")}
                          className="text-[10px] text-[#444] hover:text-red-400 transition-colors">Disconnect</button>
                      </div>
                    )}
                  </div>
                  {!integrations.zendesk?.connected && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <input value={zdSubdomain} onChange={(e) => setZdSubdomain(e.target.value)}
                          placeholder="your-subdomain"
                          className="rounded-xl bg-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:bg-[#1f1f1f]" />
                        <input value={zdEmail} onChange={(e) => setZdEmail(e.target.value)}
                          placeholder="admin@email.com"
                          className="rounded-xl bg-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:bg-[#1f1f1f]" />
                        <input value={zdKey} onChange={(e) => setZdKey(e.target.value)}
                          placeholder="API token" type="password"
                          className="rounded-xl bg-[#1a1a1a] px-3 py-2 text-xs text-[#ccc] placeholder-[#444] outline-none focus:bg-[#1f1f1f]" />
                      </div>
                      <button onClick={connectZendesk} disabled={zdSaving || !zdSubdomain || !zdEmail || !zdKey}
                        className="flex items-center gap-2 rounded-xl bg-[#1a1a1a] px-4 py-2 text-xs font-bold text-[#888] hover:bg-[#222] transition-colors disabled:opacity-40">
                        {zdSaving ? <Spinner /> : null} Connect Zendesk
                      </button>
                    </div>
                  )}
                  {integrations.zendesk?.connected && (
                    <p className="text-[10px] text-[#333]">Subdomain: {integrations.zendesk.subdomain}</p>
                  )}
                </div>

                {/* Salesforce — coming soon */}
                <div className="rounded-2xl bg-[#111111] p-5 flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-bold text-white">Salesforce</p>
                    <p className="text-[10px] text-[#444] mt-0.5">Sync leads and cases with Salesforce CRM.</p>
                  </div>
                  <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#444]">Coming soon</span>
                </div>

                {/* Shopify — coming soon */}
                <div className="rounded-2xl bg-[#111111] p-5 flex items-center justify-between opacity-50">
                  <div>
                    <p className="text-sm font-bold text-white">Shopify</p>
                    <p className="text-[10px] text-[#444] mt-0.5">Look up orders and customer data from your Shopify store.</p>
                  </div>
                  <span className="rounded-full bg-[#1a1a1a] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#444]">Coming soon</span>
                </div>

                {intLoading && (
                  <div className="flex justify-center py-4"><Spinner /></div>
                )}
              </div>
            )}

            {/* ── Settings tab ── */}
            {navActive === "settings" && (
              <div className="space-y-4">
                <h2 className="text-base font-black text-white">Settings</h2>

                <div className="rounded-2xl bg-[#111111] p-5 space-y-4">
                  <div>
                    <p className="text-sm font-bold text-white">Emergency Notifications</p>
                    <p className="text-[10px] text-[#444] mt-0.5">
                      Get an SMS and email the instant an emergency ticket comes in — any channel, 24/7.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#444]">
                      Alert phone <span className="normal-case font-normal text-[#333]">— receives SMS on emergencies</span>
                    </label>
                    <input
                      value={alertPhone}
                      onChange={(e) => setAlertPhone(e.target.value)}
                      placeholder="+13135550100"
                      className="block w-full max-w-xs rounded-xl bg-[#1a1a1a] px-4 py-2.5 text-sm text-[#ccc] placeholder-[#444] outline-none focus:bg-[#1f1f1f] transition-colors"
                    />
                    <p className="text-[10px] text-[#333]">
                      Email alerts go to your account email automatically when SendGrid is configured.
                    </p>
                  </div>
                  <button
                    onClick={saveSettings}
                    disabled={settingsSaving}
                    className="flex items-center gap-2 rounded-xl bg-[#f97316] px-4 py-2 text-xs font-bold text-white transition-opacity disabled:opacity-40"
                  >
                    {settingsSaving ? <Spinner /> : null} Save
                  </button>
                </div>

                <div className="rounded-2xl bg-[#111111] p-5 space-y-3">
                  <p className="text-sm font-bold text-white">Account</p>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#333]">Business</p>
                    <p className="text-xs text-[#888]">{bizName || bizId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#333]">Business ID</p>
                    <p className="font-mono text-[10px] text-[#444]">{bizId}</p>
                  </div>
                  <button onClick={handleLogout}
                    className="rounded-xl bg-[#1a1a1a] px-4 py-2 text-xs font-semibold text-[#555] hover:bg-[#222] hover:text-[#888] transition-colors">
                    Log out
                  </button>
                </div>
              </div>
            )}

            {/* ── Help placeholder ── */}
            {navActive === "help" && (
              <div className="flex flex-col items-center py-24 gap-3">
                <p className="text-2xl font-black text-[#1f1f1f]">Help Desk</p>
                <p className="text-xs text-[#333]">Coming soon.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
