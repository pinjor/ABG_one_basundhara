import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { LoginResponseDto } from "@bsc/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/ui/Button";
import { Field, TextInput } from "../components/ui/Field";

export function Login() {
  const [email, setEmail] = useState("admin@bsc.com.bd");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<LoginResponseDto>("/auth/login", { email, password });
      setSession(data.accessToken, data.user);
      navigate("/", { replace: true });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <div className="mb-8 text-center">
          <div className="font-display text-2xl font-bold text-gold">BASHUNDHARA</div>
          <div className="font-display text-base font-semibold text-text-dim">SPORTS CITY</div>
          <p className="mt-2 text-xs text-text-dimmer">Digital Management Platform — Command Centre</p>
        </div>
        <form onSubmit={onSubmit}>
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          {error && <p className="mb-3 text-sm text-red">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-text-dimmer">
          Seed accounts use password <span className="text-text-dim">Password123!</span>
        </p>
      </div>
    </div>
  );
}
