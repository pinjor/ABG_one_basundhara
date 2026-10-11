import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLE_LABELS, ROLE_SCOPE, Role, roleHomePath, type LoginResponseDto } from "@bsc/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { BrandLogo } from "../components/BrandLogo";

const JOURNEY = ["Play", "Move", "Shop", "Relax", "Connect"] as const;

const DEMO_PASSWORD = "Password123!";

const DEMO_ACCOUNTS = [
  { email: "admin@bsc.com.bd", role: Role.SUPER_ADMIN },
  { email: "venue.manager@bsc.com.bd", role: Role.VENUE_FACILITY_MANAGER },
  { email: "bookings@bsc.com.bd", role: Role.BOOKINGS_OFFICER },
  { email: "gate.officer@bsc.com.bd", role: Role.GATE_SECURITY_OFFICER },
  { email: "protocol@bsc.com.bd", role: Role.PROTOCOL_OFFICER },
  { email: "hospitality@bsc.com.bd", role: Role.HOSPITALITY_LEAD },
  { email: "parking@bsc.com.bd", role: Role.PARKING_MARSHAL },
  { email: "fleet@bsc.com.bd", role: Role.FLEET_DISPATCHER },
  { email: "executive@bsc.com.bd", role: Role.READ_ONLY_EXECUTIVE },
  { email: "tickets@bsc.com.bd", role: Role.TICKET_ADMINISTRATOR },
  { email: "finance@bsc.com.bd", role: Role.FINANCE_CONTROLLER },
] as const;

export function Login() {
  const [email, setEmail] = useState("admin@bsc.com.bd");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function signIn(nextEmail: string, nextPassword: string) {
    setEmail(nextEmail);
    setPassword(nextPassword);
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<LoginResponseDto>("/auth/login", {
        email: nextEmail,
        password: nextPassword,
      });
      setSession(data.accessToken, data.user);
      navigate(roleHomePath(data.user.role), { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void signIn(email, password);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <img
        src="/login-hero.jpg"
        alt=""
        className="login-hero absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 lg:px-14 lg:py-12 xl:px-20">
          <div className="login-rise">
            <BrandLogo size="sm" align="start" className="mb-8 drop-shadow-lg lg:mb-10" />
            <p className="gold-foil mb-3 text-[11px] font-semibold uppercase tracking-[0.32em]">Command Centre</p>
            <h1 className="font-display text-[2.75rem] font-extrabold leading-[0.9] tracking-wide drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
              <span className="gold-foil">BASHUNDHARA</span>
              <span className="gold-foil mt-1 block">SPORTS CITY</span>
            </h1>
            <p className="gold-foil mt-5 max-w-xl font-display text-lg font-semibold tracking-wide sm:text-2xl">
              One App. One City. Endless Possibilities.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold tracking-wide">
              {JOURNEY.map((item, i) => (
                <span key={item} className="flex items-center gap-4">
                  <span className="gold-foil">{item}</span>
                  {i < JOURNEY.length - 1 && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold-soft" />}
                </span>
              ))}
            </div>
          </div>
        </section>

        <aside className="flex items-end justify-center px-4 pb-8 sm:px-8 lg:w-[440px] lg:items-center lg:border-l lg:border-gold/20 lg:bg-navbar/90 lg:px-10 lg:pb-0 lg:backdrop-blur-2xl xl:w-[480px]">
          <div className="login-rise w-full max-w-md rounded-2xl border border-gold/25 bg-navbar/90 p-7 shadow-gold lg:max-w-none lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-0">
            <div className="mb-7">
              <div className="gold-line mb-4 h-px w-14" />
              <h2 className="font-display text-3xl font-bold tracking-wide text-text">Staff access</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-dim">
                Sign in to operate the live complex — or click a demo role below.
              </p>
              <Link to="/tickets" className="mt-3 inline-block text-sm text-[var(--brand-gold)]">Buy match tickets</Link>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="gold-foil mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full rounded-lg border border-gold/25 bg-search px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dimmer focus-visible:border-gold-soft"
                />
              </label>
              <label className="block">
                <span className="gold-foil mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gold/25 bg-search px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dimmer focus-visible:border-gold-soft"
                />
              </label>
              {error && <p className="text-sm text-red">{error}</p>}
              <button type="submit" disabled={loading} className="gold-btn w-full rounded-lg py-3.5 font-display text-lg font-bold tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? "SIGNING IN…" : "ENTER COMMAND CENTRE"}
              </button>
            </form>

            <div className="mt-7">
              <div className="mb-3 flex items-end justify-between gap-3">
                <p className="gold-foil text-[11px] font-semibold uppercase tracking-[0.18em]">Demo login</p>
                <p className="text-[11px] text-text-dim">
                  Password <span className="text-gold-soft">{DEMO_PASSWORD}</span>
                </p>
              </div>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const active = email === account.email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      disabled={loading}
                      onClick={() => void signIn(account.email, DEMO_PASSWORD)}
                      className={`demo-chip rounded-lg px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50 ${active ? "demo-chip-active" : ""}`}
                    >
                      <div className="text-xs font-semibold text-text">{ROLE_LABELS[account.role]}</div>
                      <div className="mt-0.5 truncate text-[11px] text-gold-soft/80">{ROLE_SCOPE[account.role]}</div>
                      <div className="mt-0.5 truncate text-[11px] text-text-dimmer">{account.email}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-text-dimmer">Click a role to sign in instantly.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
