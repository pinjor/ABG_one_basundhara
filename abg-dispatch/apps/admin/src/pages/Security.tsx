import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { KeyRound, Laptop, Loader2, ShieldAlert, ShieldCheck, Smartphone } from "lucide-react";
import { ROLE_LABEL, type RoleCode } from "@abg-dispatch/shared";
import { api } from "../lib/api";
import { useAuth, type Profile } from "../lib/auth";
import { ago } from "../lib/format";
import { Card, ErrorNote, Field, PageHeader, Pill, Spinner } from "../components/ui";
import { toast } from "../components/toast";

interface Session {
  id: string;
  deviceName: string | null;
  platform: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export function SecurityPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const profile = useAuth((s) => s.profile)!;
  const enrollment = useAuth((s) => s.mfaEnrollmentRequired);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api.get<Session[]>("/auth/sessions") });

  useEffect(() => {
    if (setup) void QRCode.toDataURL(setup.otpauthUri, { margin: 1, width: 220, color: { dark: "#0C1727", light: "#FFFFFF" } }).then(setQr);
  }, [setup]);

  const start = useMutation({ mutationFn: () => api.post<{ secret: string; otpauthUri: string }>("/auth/mfa/setup"), onSuccess: setSetup });
  const enable = useMutation({
    mutationFn: () => api.post<{ accessToken: string; refreshToken: string }>("/auth/mfa/enable", { code }),
    onSuccess: async (tokens) => {
      useAuth.getState().set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, mfaEnrollmentRequired: false });
      const me = await api.get<Profile>("/auth/me");
      useAuth.getState().set({ profile: me });
      setSetup(null);
      setCode("");
      toast.success("Two-factor authentication is on. You'll be asked for a code at each sign-in.");
      void qc.invalidateQueries();
      if (enrollment) navigate("/", { replace: true });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["sessions"] }),
    onError: toast.error,
  });
  const changePw = useMutation({
    mutationFn: () => api.post("/auth/password", { currentPassword: pw.current, newPassword: pw.next }),
    onSuccess: () => {
      toast.success("Password changed. Your other devices have been signed out.");
      setPw({ current: "", next: "", confirm: "" });
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader overline="Account" title="My security" subtitle={`${profile.displayName} · ${profile.roles.map((r) => ROLE_LABEL[r as RoleCode] ?? r).join(", ")}`} />

      {enrollment && (
        <div className="flex items-start gap-3 rounded-2xl border border-pending/30 bg-pending-soft px-5 py-4 text-sm text-pending">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Two-factor authentication is required for administrators</p>
            <p className="mt-0.5">Set it up below to open the control centre. It takes about a minute with Google Authenticator, Microsoft Authenticator or 1Password.</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Two-factor authentication">
          {profile.mfaEnabled ? (
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-success-soft text-success">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-navy">On</p>
                <p className="text-sm text-ink-muted">Every sign-in asks for a code from your authenticator app.</p>
              </div>
            </div>
          ) : !setup ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">Protect your administrator account with a time-based code from an authenticator app on your phone.</p>
              <button className="btn-primary" onClick={() => start.mutate()} disabled={start.isPending}>
                {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Set up two-factor
              </button>
              <ErrorNote error={start.error} />
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
              <div className="rounded-xl border border-line p-2">{qr ? <img src={qr} alt="Scan with your authenticator app" className="h-auto w-full" /> : <Spinner />}</div>
              <div className="space-y-3">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
                  <li>Open your authenticator app and add an account.</li>
                  <li>Scan the code, or type this key:</li>
                </ol>
                <p className="mono break-all rounded-lg bg-surface px-3 py-2 text-xs text-navy">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</p>
                <Field label="Enter the 6-digit code it shows">
                  {(id) => <input id={id} className="input mono h-11 text-center text-lg tracking-[0.4em]" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />}
                </Field>
                <button className="btn-primary w-full" disabled={code.length !== 6 || enable.isPending} onClick={() => enable.mutate()}>
                  {enable.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Turn on
                </button>
                <ErrorNote error={enable.error} />
              </div>
            </div>
          )}
        </Card>

        <Card title="Change password">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              changePw.mutate();
            }}
          >
            <Field label="Current password">{(id) => <input id={id} type="password" className="input" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>
            <Field label="New password" hint="At least 10 characters.">{(id) => <input id={id} type="password" className="input" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />}</Field>
            <Field label="Confirm new password">{(id) => <input id={id} type="password" className="input" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />}</Field>
            {pw.confirm && pw.confirm !== pw.next && <p className="text-xs text-danger">The passwords do not match.</p>}
            <ErrorNote error={changePw.error} />
            <button className="btn-primary" disabled={!pw.current || pw.next.length < 10 || pw.next !== pw.confirm || changePw.isPending}>
              <KeyRound className="h-4 w-4" /> Change password
            </button>
          </form>
        </Card>
      </div>

      <Card title="Where you're signed in" padded={false}>
        {!sessions.data ? (
          <Spinner />
        ) : (
          <ul className="divide-y divide-line">
            {sessions.data.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-5 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-platinum-bright text-navy-500">{s.platform === "android" || s.platform === "ios" ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {s.deviceName ?? s.platform ?? "Unknown device"} {s.current && <Pill tone="success">This browser</Pill>}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {s.ip ?? "—"} · signed in {ago(s.createdAt)} · last active {ago(s.lastUsedAt)}
                  </p>
                </div>
                {!s.current && (
                  <button className="btn-ghost h-8 text-xs text-danger" onClick={() => revoke.mutate(s.id)}>
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
