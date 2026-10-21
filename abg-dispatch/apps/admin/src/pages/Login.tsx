import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { ApiError, api } from "../lib/api";
import { useAuth, type Profile } from "../lib/auth";
import { ErrorNote, Field } from "../components/ui";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mfaEnrollmentRequired: boolean;
  user: Profile;
}

const DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO_HINTS === "true";

export function LoginPage() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const setAuth = useAuth((s) => s.set);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<LoginResponse>("/auth/login", { identifier, password, totp: needTotp ? totp : undefined, platform: "web", deviceName: "Admin portal" });
      if (!res.user.canUseAdminPortal) {
        useAuth.getState().set({ accessToken: res.accessToken });
        await api.post("/auth/logout").catch(() => undefined);
        useAuth.getState().clear();
        throw new Error("This portal is for dispatch officers and administrators. Please use the ABG ONE mobile app.");
      }
      setAuth({ accessToken: res.accessToken, refreshToken: res.refreshToken, profile: res.user, mfaEnrollmentRequired: res.mfaEnrollmentRequired });
      navigate(res.mfaEnrollmentRequired ? "/security" : from && from !== "/login" ? from : "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && (err.code === "MFA_REQUIRED" || err.code === "MFA_INVALID")) {
        setNeedTotp(true);
        if (err.code === "MFA_INVALID") setError(err);
      } else setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-midnight lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(202,208,216,0.10),transparent_65%)]" />
        <div className="pointer-events-none absolute -bottom-56 -left-24 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(47,111,237,0.10),transparent_65%)]" />
        <img src="/brand/abg-logo-original.png" alt="Anvir Bashundhara Group" className="relative w-[300px]" />
        <div className="relative max-w-lg">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-platinum-deep">ABG ONE · Group Operations Portal</p>
          <h1 className="font-display text-[40px] font-extrabold leading-[1.08] tracking-tight text-platinum-bright">
            Every document, parcel and instrument — accounted for, end to end.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-platinum/75">
            A tamper-evident custody ledger for Head Office, the corporate office and every factory. Arrival is never mistaken for receipt.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ["Verified", "handovers"],
              ["Append-only", "event ledger"],
              ["Proof of", "receipt"],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-semibold text-platinum-bright">{a}</p>
                <p className="text-xs text-platinum-deep">{b}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-platinum-deep/70">© Anvir Bashundhara Group · Internal use only</p>
      </section>

      <section className="flex flex-col items-center justify-center bg-surface px-5 py-12">
        <div className="mb-8 w-full max-w-[400px] rounded-2xl bg-midnight p-5 lg:hidden">
          <img src="/brand/abg-logo-original.png" alt="Anvir Bashundhara Group" className="mx-auto w-56" />
        </div>
        <form onSubmit={submit} className="w-full max-w-[400px]">
          <p className="overline">Secure sign-in</p>
          <h2 className="mt-1 font-display text-[28px] font-extrabold tracking-tight text-navy">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-muted">For dispatch officers, office administrators and auditors.</p>

          <div className="mt-8 space-y-4">
            {!needTotp ? (
              <>
                <Field label="Email or employee ID">
                  {(id) => <input id={id} className="input h-11" autoComplete="username" placeholder="name@abg.com.bd or ABG-1001" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />}
                </Field>
                <Field label="Password">
                  {(id) => <input id={id} type="password" className="input h-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
                </Field>
              </>
            ) : (
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-navy text-platinum">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-navy">Two-factor authentication</p>
                    <p className="text-xs text-ink-muted">Enter the 6-digit code from your authenticator app.</p>
                  </div>
                </div>
                <input
                  className="input mono h-12 text-center text-xl tracking-[0.5em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-label="Authenticator code"
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                />
              </div>
            )}
            <ErrorNote error={error} />
            <button type="submit" className="btn-primary h-11 w-full" disabled={busy || (needTotp && totp.length !== 6)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {needTotp ? "Verify and sign in" : "Sign in"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
            {needTotp && (
              <button type="button" className="btn-ghost w-full" onClick={() => (setNeedTotp(false), setTotp(""), setError(null))}>
                Use a different account
              </button>
            )}
          </div>

          {DEMO && !needTotp && (
            <div className="mt-8 rounded-xl border border-dashed border-line-strong bg-white/70 p-4 text-xs text-ink-muted">
              <p className="mb-2 font-semibold text-navy">Demo accounts · password Dispatch@2026</p>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  ["admin@abg.com.bd", "Super admin"],
                  ["arif.chowdhury@abg.com.bd", "Head office admin"],
                  ["sabina.yasmin@abg.com.bd", "Branch admin · Factory A"],
                  ["tanvir.hasan@abg.com.bd", "Dispatch officer · HO"],
                  ["mahmuda.akter@abg.com.bd", "Auditor (read-only)"],
                ].map(([email, role]) => (
                  <button type="button" key={email} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-surface" onClick={() => (setIdentifier(email), setPassword("Dispatch@2026"))}>
                    <span className="font-medium text-ink">{email}</span>
                    <span>{role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
