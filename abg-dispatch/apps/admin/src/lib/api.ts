import { useAuth } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

async function refresh(): Promise<boolean> {
  const { refreshToken, set, clear } = useAuth.getState();
  if (!refreshToken) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken }) });
      if (!res.ok) {
        clear();
        return false;
      }
      const body = await res.json();
      set({ accessToken: body.accessToken, refreshToken: body.refreshToken });
      return true;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export async function request<T = any>(method: string, path: string, body?: unknown, opts: { raw?: boolean; idempotencyKey?: string } = {}): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = { accept: "application/json" };
    const token = useAuth.getState().accessToken;
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    if (opts.idempotencyKey) headers["idempotency-key"] = opts.idempotencyKey;
    return fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach the ABG ONE server. Check your connection.");
  }
  if (res.status === 401) {
    const code = (await res.clone().json().catch(() => ({})))?.code;
    if (code === "TOKEN_EXPIRED" && (await refresh())) res = await send();
    else if (code === "SESSION_REVOKED" || code === "TOKEN_EXPIRED") useAuth.getState().clear();
  }
  if (opts.raw) {
    if (!res.ok) throw new ApiError(res.status, "HTTP", `Request failed (${res.status})`);
    return res as unknown as T;
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = Array.isArray(json?.message) ? json.message.join("\n") : json?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, json?.code ?? "HTTP", message, json?.details);
  }
  return json as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body: unknown = {}, idempotencyKey?: string) => request<T>("POST", path, body, { idempotencyKey }),
  put: <T = any>(path: string, body: unknown = {}) => request<T>("PUT", path, body),
  patch: <T = any>(path: string, body: unknown = {}) => request<T>("PATCH", path, body),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
};

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}

/** Downloads an authorised file (CSV export) without exposing the token in a URL. */
export async function download(path: string, filename: string) {
  const res = await request<Response>("GET", path, undefined, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Server-sent events over fetch (EventSource cannot send an Authorization
 * header). Calls onEvent for every parcel change in the viewer's branches.
 */
export function subscribeLive(onEvent: (e: { parcelId: string; trackingNumber: string; status: string; eventTypes: string[] }) => void, onState: (live: boolean) => void): () => void {
  let stopped = false;
  let controller = new AbortController();
  const run = async () => {
    while (!stopped) {
      try {
        const token = useAuth.getState().accessToken;
        const res = await fetch("/api/admin/stream", { headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" }, signal: controller.signal });
        if (res.status === 401) await refresh();
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        onState(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const type = chunk.match(/^event: (.*)$/m)?.[1];
            const data = chunk.match(/^data: (.*)$/m)?.[1];
            if (type === "parcel" && data) onEvent(JSON.parse(data));
          }
        }
      } catch {
        if (stopped) return;
      }
      onState(false);
      await new Promise((r) => setTimeout(r, 4000));
      controller = new AbortController();
    }
  };
  void run();
  return () => {
    stopped = true;
    controller.abort();
  };
}

/** Multipart upload (attachments, photos). Retries once after a token refresh. */
export async function upload<T = any>(path: string, file: File, fields: Record<string, string>, fileField = "file"): Promise<T> {
  const send = () => {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append(fileField, file);
    const token = useAuth.getState().accessToken;
    return fetch(`/api${path}`, { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: form });
  };
  let res = await send();
  if (res.status === 401 && (await refresh())) res = await send();
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json?.code ?? "HTTP", Array.isArray(json?.message) ? json.message.join("\n") : json?.message ?? `Upload failed (${res.status})`);
  return json as T;
}

export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
