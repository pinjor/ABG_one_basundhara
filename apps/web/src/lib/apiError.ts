import axios from "axios";

/** Surface the server's message only. Never show a stack or an internal code path. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return "Network unavailable";
  const message = error.response.data?.message;
  if (Array.isArray(message)) return message.map(String).join(" ");
  if (typeof message === "string" && message.length < 240) return message;
  return fallback;
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
