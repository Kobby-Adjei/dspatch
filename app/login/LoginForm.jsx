"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveAuth } from "../lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://dspatch-flask.29wb2lul59qv.ca-tor.codeengine.appdomain.cloud";

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginForm() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Email and password are required."); return; }

    setLoading(true);
    setError("");
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      saveAuth(data.token, data.business);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message.includes("fetch")
        ? "Could not reach the server. Try again shortly."
        : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Nav */}
      <header className="border-b border-white/6">
        <nav className="flex h-16 items-center justify-between px-6 max-w-5xl mx-auto w-full">
          <Link href="/">
            <img src="/dspatch_logo.svg" alt="DSPatch" className="h-12 w-48 object-contain object-left" />
          </Link>
          <Link href="/onboard" className="text-xs font-semibold text-white/28 hover:text-white/60 transition-colors">
            Create account →
          </Link>
        </nav>
      </header>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-[420px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-orange-400">
            Welcome back
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight">
            Log in to your<br />command center.
          </h1>
          <p className="mt-4 text-sm text-white/40">
            Your tickets and customer history are waiting.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 grid gap-4">
            <div className="grid gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
                Work email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40 focus:bg-white/[0.07]"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/30">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-base text-white placeholder-white/18 outline-none transition-all duration-200 focus:border-orange-500/40 focus:bg-white/[0.07]"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-orange-500/20 bg-orange-500/8 px-4 py-3 text-xs font-semibold text-orange-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-sm font-black text-black transition-all duration-150 hover:bg-orange-50 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in…" : <><span>Log in</span> <IconArrow /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-white/25">
            No account?{" "}
            <Link href="/onboard" className="text-white/50 underline hover:text-white/80 transition-colors">
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
