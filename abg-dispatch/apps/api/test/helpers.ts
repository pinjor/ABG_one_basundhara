/**
 * Boots the real API in-process against a disposable PostgreSQL database
 * (TEST_DATABASE_URL, default abg_dispatch_test), with demo data reloaded.
 */
import "reflect-metadata";
import { spawnSync } from "bun";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { INestApplication } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://abg:abg_dev_password@localhost:5432/abg_dispatch_test?schema=public";
process.env.DATABASE_URL = TEST_DB;
process.env.SLA_INTERVAL_SECONDS = "0";
process.env.EXPOSE_DEV_OTP = "true";
process.env.DISABLE_RATE_LIMIT = "true";
process.env.STORAGE_DIR = mkdtempSync(join(tmpdir(), "abg-dispatch-test-"));
process.env.PATHAO_WEBHOOK_SECRET = "test-pathao-secret";
process.env.STEADFAST_WEBHOOK_SECRET = "test-steadfast-secret";
process.env.NODE_ENV = "test";

export const PASSWORD = "Dispatch@2026";

let app: INestApplication | null = null;
let baseUrl = "";
let prismaClient: PrismaClient | null = null;
let migrated = false;

export async function startApp() {
  if (!migrated) {
    const out = spawnSync(["bunx", "prisma", "migrate", "deploy"], { cwd: join(import.meta.dir, ".."), env: { ...process.env, DATABASE_URL: TEST_DB } });
    if (out.exitCode !== 0) throw new Error(`migrate deploy failed: ${out.stderr.toString()}`);
    migrated = true;
  }
  if (!app) {
    const { NestFactory } = await import("@nestjs/core");
    const { AppModule } = await import("../src/app.module");
    const { configureApp } = await import("../src/main");
    app = await NestFactory.create(AppModule, { rawBody: true, logger: ["error"] });
    configureApp(app);
    await app.listen(0, "127.0.0.1");
    baseUrl = `${(await app.getUrl()).replace("[::1]", "127.0.0.1")}/api`;
    const { PrismaService } = await import("../src/common/prisma.service");
    prismaClient = app.get(PrismaService);
  }
  return { app, baseUrl, prisma: prismaClient! };
}

export async function resetAndSeed() {
  const { prisma } = await startApp();
  const { resetDatabase, seed } = await import("../prisma/seed");
  await resetDatabase(prisma);
  // The reset revokes every session, so cached sign-ins are no longer valid.
  tokens.clear();
  return seed(prisma, { history: false });
}

export async function stopApp() {
  // Kept alive across files in one bun test process; closed at exit.
}

process.on("beforeExit", async () => {
  if (app) await app.close();
  app = null;
});

export interface Res<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

export async function api<T = any>(method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string>; raw?: string } = {}): Promise<Res<T>> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let payload: string | undefined;
  if (opts.raw !== undefined) {
    payload = opts.raw;
    headers["content-type"] ??= "application/json";
  } else if (opts.body !== undefined) {
    payload = JSON.stringify(opts.body);
    headers["content-type"] = "application/json";
  }
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* CSV or plain text */
  }
  return { status: res.status, body: body as T, headers: res.headers };
}

const tokens = new Map<string, string>();
export async function login(identifier: string): Promise<string> {
  const cached = tokens.get(identifier);
  if (cached) return cached;
  const res = await api("POST", "/auth/login", { body: { identifier, password: PASSWORD } });
  if (res.status !== 200) throw new Error(`login ${identifier} failed: ${res.status} ${JSON.stringify(res.body)}`);
  tokens.set(identifier, res.body.accessToken);
  return res.body.accessToken;
}

export function clearTokens() {
  tokens.clear();
}

export function key(prefix = "k"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function directoryIds() {
  const { prisma } = await startApp();
  const emp = async (code: string) => (await prisma.employee.findUniqueOrThrow({ where: { employeeCode: code } })).id;
  const cat = async (code: string) => (await prisma.parcelCategory.findUniqueOrThrow({ where: { code } })).id;
  const branch = async (code: string) => (await prisma.branch.findUniqueOrThrow({ where: { code } })).id;
  return { emp, cat, branch };
}

/** Book a parcel as `senderEmail` with sensible defaults; returns the API response body. */
export async function book(senderEmail: string, overrides: Record<string, unknown> = {}) {
  const { emp, cat } = await directoryIds();
  const body = {
    title: "Contract Documents",
    description: "Quarterly supplier agreement requiring director signature.",
    categoryId: await cat("AGREEMENT_CONTRACT"),
    classification: "CONFIDENTIAL",
    priority: "URGENT",
    deliveryMethod: "INTERNAL_EMPLOYEE",
    receiverType: "EMPLOYEE",
    receiverEmployeeId: await emp("ABG-7231"),
    carrier: { type: "INTERNAL_EMPLOYEE", employeeId: await emp("ABG-4832") },
    ...overrides,
  };
  const res = await api("POST", "/parcels", { token: await login(senderEmail), body, headers: { "idempotency-key": key("book") } });
  if (res.status !== 201) throw new Error(`booking failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as { parcel: any; handoverPin?: string };
}
