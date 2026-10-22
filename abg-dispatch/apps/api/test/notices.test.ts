import { beforeAll, describe, expect, test } from "bun:test";
import type { PrismaClient } from "@prisma/client";
import { NoticeStatus, isNoticeNumber } from "@abg-dispatch/shared";
import { buildNoticePdf } from "../prisma/seed-modules/notices";
import { hmacSha256 } from "../src/common/crypto";
import { loadConfig } from "../src/common/config";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const CHAIRMAN = "chairman@abg.com.bd";
const MD = "md@abg.com.bd";
const SADIA = "sadia.rahman@abg.com.bd"; // HR & Finance
const SHIRIN = "shirin.akhter@abg.com.bd"; // Compliance officer
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin (notice.manage)
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const RAHIM = "rahim@abg.com.bd"; // Head office employee
const FARHANA = "farhana.islam@abg.com.bd"; // Factory A employee
const IMRAN = "imran.hossain@abg.com.bd"; // Factory B employee
const AUDITOR = "mahmuda.akter@abg.com.bd";

let baseUrl = "";
let origin = "";
let prisma: PrismaClient;

const pdf = (title = "Circular") => ({ name: `${title.replace(/\W+/g, "-")}.pdf`, data: buildNoticePdf({ title, paragraphs: ["## Purpose", "This circular explains the rule.", "- One", "- Two"], signature: ["Managing Director"] }) });

/** Multipart POST, as the portal and the app send it. */
async function postNotice(identifier: string, fields: Record<string, string | string[] | boolean>, file?: { name: string; data: Buffer | string }, idempotencyKey?: string, path = "/notices") {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) for (const item of v) form.append(k, item);
    else form.append(k, String(v));
  }
  if (file) form.append("attachment", new Blob([file.data], { type: "application/pdf" }), file.name);
  const headers: Record<string, string> = { authorization: `Bearer ${await login(identifier)}` };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers, body: form });
  return { status: res.status, body: (await res.json()) as any };
}

const notice = (fields: Record<string, string | string[] | boolean> = {}) => ({
  title: "Office timing during the winter months",
  body: "From 1 November all offices open at 9:30 am and close at 5:30 pm.\n\nFactories keep their shift timings.",
  channel: "HR",
  category: "GENERAL",
  ...fields,
});

const get = async (identifier: string, path: string) => api("GET", path, { token: await login(identifier) });
const send = async (identifier: string, method: string, path: string, body?: unknown) => api(method, path, { token: await login(identifier), body });
const userId = async (email: string) => (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
const branchId = async (code: string) => (await prisma.branch.findUniqueOrThrow({ where: { code } })).id;
const notificationsFor = async (identifier: string) => (await get(identifier, "/notifications?limit=50")).body.items as any[];
async function boardIds(identifier: string, query = "") {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const res = await get(identifier, `/notices?limit=50${query}${cursor ? `&cursor=${cursor}` : ""}`);
    expect(res.status).toBe(200);
    ids.push(...res.body.items.map((i: any) => i.id));
    cursor = res.body.nextCursor;
  } while (cursor);
  return ids;
}
/** Everyone who could read the board, minus the author. */
async function audienceOf(authorEmail: string, branchCodes?: string[]) {
  return prisma.user.count({
    where: {
      active: true,
      email: { not: authorEmail },
      roles: { some: {} },
      ...(branchCodes ? { employee: { branch: { code: { in: branchCodes } } } } : {}),
    },
  });
}

describe("official notice board", () => {
  let circular: any;

  beforeAll(async () => {
    ({ baseUrl, prisma } = await startApp());
    origin = baseUrl.replace(/\/api$/, "");
    await resetAndSeed();
    clearTokens();
  });

  test("the seeded board looks real: pinned Chairman's message, urgent factory circular, drafts and receipts", async () => {
    const all = await prisma.notice.findMany({ include: { receipts: true } });
    expect(all.length).toBeGreaterThanOrEqual(9);
    expect(all.filter((n) => n.status === NoticeStatus.DRAFT)).toHaveLength(1);
    expect(all.filter((n) => n.status === NoticeStatus.ARCHIVED)).toHaveLength(1);
    expect(all.every((n) => isNoticeNumber(n.referenceNumber))).toBe(true);
    const lpg = all.find((n) => n.title.includes("LPG"))!;
    expect(lpg).toMatchObject({ urgent: true, audience: "BRANCHES", requiresAcknowledgement: true });
    expect((lpg.branchIds as string[]).sort()).toEqual([await branchId("FCA"), await branchId("FCB")].sort());
    expect(lpg.receipts.some((r) => r.acknowledgedAt)).toBe(true);
    expect(all.filter((n) => n.attachmentKey)).toHaveLength(2);

    const board = await get(RAHIM, "/notices?limit=5");
    expect(board.status).toBe(200);
    expect(board.body.items[0]).toMatchObject({ channel: "CHAIRMAN", pinned: true });
    for (const row of board.body.items) {
      for (const field of ["id", "referenceNumber", "title", "excerpt", "channel", "category", "urgent", "pinned", "signedBy", "publishedAt", "hasAttachment", "requiresAcknowledgement", "read", "acknowledged"]) expect(row).toHaveProperty(field);
      expect(row.excerpt.length).toBeLessThanOrEqual(180);
    }
    // Factory notices are not on head office's board.
    expect(board.body.items.some((i: any) => i.title.includes("LPG") || i.title.includes("canteen"))).toBe(false);
  });

  test("the MD publishes an urgent circular with a PDF: everyone is told, and opening it marks it read", async () => {
    const before = (await get(RAHIM, "/notices/unread-count")).body;
    const res = await postNotice(
      MD,
      notice({ title: "Board meeting moved to Thursday", channel: "MANAGING_DIRECTOR", category: "CIRCULAR", urgent: "true", requiresAcknowledgement: "true", publish: "true" }),
      pdf("Board meeting"),
    );
    expect(res.status).toBe(201);
    circular = res.body;
    expect(isNoticeNumber(circular.referenceNumber)).toBe(true);
    expect(circular).toMatchObject({ status: "PUBLISHED", urgent: true, channel: "MANAGING_DIRECTOR", hasAttachment: true, signedBy: "Kazi Ashraful Haque, Managing Director" });
    expect(circular.attachmentUrl).toMatch(/^\/api\/notice-attachments\/.+\/content\?exp=\d+&sig=/);
    expect(circular.viewer.actions).toEqual(expect.arrayContaining(["EDIT", "ARCHIVE", "VIEW_RECEIPTS"]));
    expect(circular.counters).toMatchObject({ audienceSize: await audienceOf(MD), readCount: 0, acknowledgedCount: 0, acknowledgedPct: 0 });

    const told = (await notificationsFor(RAHIM)).find((n) => n.data?.objectId === circular.id);
    expect(told).toMatchObject({ category: "ACTION_REQUIRED", eventType: "NOTICE_PUBLISHED", read: false });
    expect(told.title).toBe("Urgent notice: Board meeting moved to Thursday");
    expect(told.data.route).toBe(`/notices/${circular.id}`);
    expect((await notificationsFor(IMRAN)).some((n) => n.data?.objectId === circular.id)).toBe(true);
    expect((await notificationsFor(MD)).some((n) => n.data?.objectId === circular.id)).toBe(false);

    const after = (await get(RAHIM, "/notices/unread-count")).body;
    expect(after).toEqual({ unread: before.unread + 1, toAcknowledge: before.toAcknowledge + 1, urgentUnread: before.urgentUnread + 1 });
    const row = (await get(RAHIM, "/notices?limit=50")).body.items.find((i: any) => i.id === circular.id);
    expect(row).toMatchObject({ read: false, acknowledged: false, urgent: true, hasAttachment: true });

    const opened = await get(RAHIM, `/notices/${circular.id}`);
    expect(opened.status).toBe(200);
    expect(opened.body).toMatchObject({ read: true, acknowledged: false, counters: null, body: expect.stringContaining("9:30 am") });
    expect(opened.body.viewer.actions).toEqual(["ACKNOWLEDGE"]);
    expect((await get(RAHIM, "/notices/unread-count")).body.unread).toBe(before.unread);
    expect((await notificationsFor(RAHIM)).find((n) => n.data?.objectId === circular.id).read).toBe(true);
  });

  test("acknowledging is idempotent and the sender's counters follow", async () => {
    const first = await send(RAHIM, "POST", `/notices/${circular.id}/acknowledge`);
    expect(first.status).toBe(200);
    expect(first.body.acknowledged).toBe(true);
    expect(first.body.viewer.actions).not.toContain("ACKNOWLEDGE");
    const second = await send(RAHIM, "POST", `/notices/${circular.id}/acknowledge`);
    expect(second.status).toBe(200);
    expect(second.body.receipt.acknowledgedAt).toBe(first.body.receipt.acknowledgedAt);
    expect(await prisma.noticeReceipt.count({ where: { noticeId: circular.id } })).toBe(1);

    await get(FARHANA, `/notices/${circular.id}`); // opens, does not acknowledge
    const audience = await audienceOf(MD);
    const asMd = await get(MD, `/notices/${circular.id}`);
    expect(asMd.body.counters).toEqual({ audienceSize: audience, readCount: 2, acknowledgedCount: 1, acknowledgedPct: Math.round((1 / audience) * 100), readPct: Math.round((2 / audience) * 100) });
    // Opening their own notice never counts the author as a reader.
    expect(await prisma.noticeReceipt.count({ where: { noticeId: circular.id, userId: await userId(MD) } })).toBe(0);
    expect((await send(MD, "POST", `/notices/${circular.id}/acknowledge`)).body.code).toBe("NOTICE_ACK_NOT_NEEDED");

    // Auditors read the board and may acknowledge, but never publish.
    expect((await send(AUDITOR, "POST", `/notices/${circular.id}/acknowledge`)).status).toBe(200);
    expect((await postNotice(AUDITOR, notice())).status).toBe(403);
  });

  test("the receipts report lists who acknowledged, who only read it and who is still pending", async () => {
    const path = `/admin/notices/${circular.id}/receipts`;
    const acknowledged = await get(MD, `${path}?state=acknowledged`);
    expect(acknowledged.status).toBe(200);
    expect(acknowledged.body.items.map((i: any) => i.name).sort()).toEqual(["Mahmuda Akter", "Md. Rahim"]);
    expect(acknowledged.body.items[0]).toMatchObject({ designation: expect.any(String), office: { code: "HO" }, acknowledgedAt: expect.any(String) });

    const read = await get(MD, `${path}?state=read`);
    expect(read.body.items.map((i: any) => i.name)).toEqual(["Farhana Islam"]);
    expect(read.body.items[0].office.code).toBe("FCA");

    const audience = await audienceOf(MD);
    const pending = await get(MD, `${path}?state=pending&limit=7`);
    expect(pending.body.counts).toEqual({ audience, acknowledged: 2, read: 1, pending: audience - 2 });
    const names: string[] = pending.body.items.map((i: any) => i.name);
    let cursor = pending.body.nextCursor;
    while (cursor) {
      const page = await get(MD, `${path}?state=pending&limit=7&cursor=${cursor}`);
      names.push(...page.body.items.map((i: any) => i.name));
      cursor = page.body.nextCursor;
    }
    expect(names).toHaveLength(audience - 2);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("Farhana Islam"); // read but not acknowledged is still pending
    expect(names).not.toContain("Md. Rahim");
    expect(names).not.toContain("Kazi Ashraful Haque");

    const search = await get(MD, `${path}?state=pending&q=Imran`);
    expect(search.body.items.map((i: any) => i.name)).toEqual(["Imran Hossain"]);

    // Only the author and managers see who has read it.
    expect((await get(ARIF, path)).status).toBe(200);
    expect((await get(SADIA, path)).status).toBe(404);
    expect((await get(RAHIM, path)).status).toBe(403);
  });

  test("a notice for Factory A is hidden from head office and Factory B staff", async () => {
    const res = await postNotice(SABINA, notice({ title: "Factory A gate closes at 10 pm", channel: "ADMINISTRATION", audience: "BRANCHES", branchIds: [await branchId("FCA")], publish: "true" }));
    expect(res.status).toBe(201);
    const id = res.body.id;
    expect(res.body.branches.map((b: any) => b.code)).toEqual(["FCA"]);

    expect(await boardIds(FARHANA)).toContain(id);
    expect((await get(FARHANA, `/notices/${id}`)).status).toBe(200);
    for (const outsider of [RAHIM, IMRAN]) {
      expect(await boardIds(outsider)).not.toContain(id);
      const open = await get(outsider, `/notices/${id}`);
      expect(open.status).toBe(404);
      expect(open.body.code).toBe("NOTICE_NOT_FOUND");
      expect((await send(outsider, "POST", `/notices/${id}/acknowledge`)).status).toBe(404);
      expect((await notificationsFor(outsider)).some((n) => n.data?.objectId === id)).toBe(false);
    }
    expect((await notificationsFor(FARHANA)).some((n) => n.data?.objectId === id)).toBe(true);
    // Managers see it anyway, as the people responsible for the board.
    expect((await get(ARIF, `/notices/${id}`)).status).toBe(200);
    expect((await get(MD, `/admin/notices/${id}/receipts`)).body.counts.audience).toBe(await audienceOf(SABINA, ["FCA"]));
  });

  test("channel rules: HR cannot post as the Chairman; branch admins reach only their own offices", async () => {
    const asChairman = await postNotice(SADIA, notice({ channel: "CHAIRMAN" }));
    expect(asChairman.status).toBe(403);
    expect(asChairman.body.code).toBe("NOTICE_CHANNEL_FORBIDDEN");
    expect((await postNotice(ARIF, notice({ channel: "MANAGING_DIRECTOR" }))).body.code).toBe("NOTICE_CHANNEL_FORBIDDEN");
    expect((await postNotice(SHIRIN, notice({ channel: "HR" }))).body.code).toBe("NOTICE_CHANNEL_FORBIDDEN");
    expect((await postNotice(SABINA, notice({ channel: "IT", audience: "BRANCHES", branchIds: [await branchId("FCA")] }))).body.code).toBe("NOTICE_CHANNEL_FORBIDDEN");

    const everyone = await postNotice(SABINA, notice({ channel: "ADMINISTRATION", audience: "ALL" }));
    expect(everyone.status).toBe(403);
    expect(everyone.body.code).toBe("NOTICE_AUDIENCE_FORBIDDEN");
    expect((await postNotice(SABINA, notice({ channel: "ADMINISTRATION", audience: "BRANCHES", branchIds: [await branchId("FCB")] }))).body.code).toBe("NOTICE_AUDIENCE_FORBIDDEN");
    expect((await postNotice(SABINA, notice({ channel: "ADMINISTRATION", audience: "BRANCHES", branchIds: [] }))).body.code).toBe("NOTICE_BRANCHES_REQUIRED");

    expect((await postNotice(SADIA, notice())).status).toBe(201);
    expect((await postNotice(SHIRIN, notice({ channel: "COMPLIANCE" }))).status).toBe(201);
    expect((await postNotice(CHAIRMAN, notice({ channel: "CHAIRMAN" }))).status).toBe(201);
    expect((await postNotice(ARIF, notice({ channel: "IT" }))).status).toBe(201);
    const employee = await postNotice(RAHIM, notice());
    expect(employee.status).toBe(403);
    expect(employee.body.code).toBe("MISSING_CAPABILITY");
  });

  test("drafts stay invisible to readers until they are published, and are published once", async () => {
    const draft = await postNotice(SADIA, notice({ title: "Eid bonus disbursement dates" }), undefined, key("nb"));
    expect(draft.status).toBe(201);
    const id = draft.body.id;
    expect(draft.body).toMatchObject({ status: "DRAFT", publishedAt: null });
    expect(draft.body.viewer.actions).toEqual(expect.arrayContaining(["EDIT", "PUBLISH", "REPLACE_ATTACHMENT", "DISCARD"]));
    expect(await boardIds(RAHIM)).not.toContain(id);
    expect((await get(RAHIM, `/notices/${id}`)).status).toBe(404);
    expect((await notificationsFor(RAHIM)).some((n) => n.data?.objectId === id)).toBe(false);
    expect((await get(SADIA, "/admin/notices?status=DRAFT")).body.items.some((i: any) => i.id === id)).toBe(true);

    const published = await send(SADIA, "POST", `/notices/${id}/publish`);
    expect(published.status).toBe(200);
    expect(published.body.status).toBe("PUBLISHED");
    expect(await boardIds(RAHIM)).toContain(id);
    const told = (await notificationsFor(RAHIM)).find((n) => n.data?.objectId === id);
    expect(told).toMatchObject({ title: "New notice: Eid bonus disbursement dates", category: "ACTION_REQUIRED" });
    const again = await send(SADIA, "POST", `/notices/${id}/publish`);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("NOTICE_STATE_CONFLICT");

    const audit = await prisma.auditLog.findFirst({ where: { objectId: id, action: "notice.published" } });
    expect(audit?.actorName).toBe("Sadia Rahman");

    // A discarded draft is gone; a published notice cannot be discarded.
    const scrap = await postNotice(SADIA, notice({ title: "Draft to throw away" }));
    expect((await send(SADIA, "DELETE", `/notices/${scrap.body.id}`)).body).toEqual({ id: scrap.body.id, discarded: true });
    expect((await get(SADIA, `/notices/${scrap.body.id}`)).status).toBe(404);
    expect((await send(SADIA, "DELETE", `/notices/${id}`)).status).toBe(409);
  });

  test("a draft is fully editable; once published only pin, urgent and expiry may change", async () => {
    const draft = await postNotice(SADIA, notice({ title: "Medical camp" }));
    const id = draft.body.id;
    const edited = await send(SADIA, "PATCH", `/notices/${id}`, { title: "Free medical camp at head office", category: "EVENT", requiresAcknowledgement: false, audience: "BRANCHES", branchIds: [await branchId("HO")] });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ title: "Free medical camp at head office", category: "EVENT", requiresAcknowledgement: false, audience: "BRANCHES" });
    await send(SADIA, "POST", `/notices/${id}/publish`);

    const locked = await send(SADIA, "PATCH", `/notices/${id}`, { title: "Changed after the fact" });
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe("NOTICE_STATE_CONFLICT");
    expect(locked.body.details.fields).toEqual(["title"]);
    // Sending the unchanged title along with an allowed change is fine.
    const expiresAt = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const pinned = await send(SADIA, "PATCH", `/notices/${id}`, { title: "Free medical camp at head office", pinned: true, urgent: true, expiresAt });
    expect(pinned.status).toBe(200);
    expect(pinned.body).toMatchObject({ pinned: true, urgent: true, expiresAt });
    expect(await prisma.auditLog.count({ where: { objectId: id, action: "notice.updated" } })).toBe(1);
    expect((await send(SADIA, "PATCH", `/notices/${id}`, { expiresAt: new Date(Date.now() - 60_000).toISOString() })).body.code).toBe("NOTICE_EXPIRY_PAST");
    expect((await send(SADIA, "PATCH", `/notices/${id}`, { expiresAt: null })).body.expiresAt).toBeNull();

    // Someone else's notice: another publisher may not touch it, a manager may.
    const other = await send(SHIRIN, "PATCH", `/notices/${circular.id}`, { pinned: true });
    expect(other.status).toBe(403);
    expect(other.body.code).toBe("NOTICE_NOT_YOURS");
    expect((await send(ARIF, "PATCH", `/notices/${id}`, { pinned: false })).body.pinned).toBe(false);
    expect((await send(RAHIM, "PATCH", `/notices/${id}`, { pinned: true })).status).toBe(403);
  });

  test("archiving takes a notice off the board but keeps it for its author", async () => {
    const archived = await send(MD, "POST", `/notices/${circular.id}/archive`);
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({ status: "ARCHIVED", archivedAt: expect.any(String) });
    expect(archived.body.viewer.actions).toEqual(["VIEW_RECEIPTS"]);
    expect(await boardIds(RAHIM)).not.toContain(circular.id);
    expect((await get(RAHIM, `/notices/${circular.id}`)).status).toBe(404);
    expect((await get(MD, `/notices/${circular.id}`)).body.status).toBe("ARCHIVED");
    expect((await send(MD, "POST", `/notices/${circular.id}/archive`)).status).toBe(409);
    expect((await send(MD, "PATCH", `/notices/${circular.id}`, { pinned: true })).status).toBe(409);
    expect((await get(MD, "/admin/notices?status=ARCHIVED")).body.items.some((i: any) => i.id === circular.id)).toBe(true);
    expect(await prisma.auditLog.count({ where: { objectId: circular.id, action: { in: ["notice.published", "notice.archived"] } } })).toBe(2);
  });

  test("only real PDFs are accepted, and attachments open through a short-lived signed link", async () => {
    const fake = await postNotice(SADIA, notice({ title: "Pay scale" }), { name: "pay-scale.pdf", data: "this is plain text pretending to be a PDF" });
    expect(fake.status).toBe(400);
    expect(fake.body.code).toBe("NOTICE_ATTACHMENT_TYPE");
    const png = await postNotice(SADIA, notice({ title: "Pay scale" }), { name: "pay.pdf", data: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex") });
    expect(png.body.code).toBe("NOTICE_ATTACHMENT_TYPE");

    const res = await postNotice(SADIA, notice({ title: "Revised pay scale", publish: "true" }), pdf("Pay scale 2027"));
    expect(res.status).toBe(201);
    const url: string = res.body.attachmentUrl;
    const signed = await fetch(`${origin}${url}`);
    expect(signed.status).toBe(200);
    expect(signed.headers.get("content-type")).toBe("application/pdf");
    expect(signed.headers.get("content-disposition")).toMatch(/^inline; filename="Pay-scale-2027.pdf"/);
    expect(signed.headers.get("x-frame-options")).toBeNull();
    expect(signed.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(Buffer.from(await signed.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");

    const forged = await fetch(`${origin}${url.replace(/sig=[^&]+/, "sig=forged")}`);
    expect(forged.status).toBe(401);
    expect(((await forged.json()) as any).code).toBe("LINK_INVALID");
    // A correctly signed link whose time is up.
    const row = await prisma.notice.findUniqueOrThrow({ where: { id: res.body.id } });
    const exp = Math.floor(Date.now() / 1000) - 5;
    const sig = hmacSha256(loadConfig().jwtSecret, `notice-attachment.${row.id}.${row.attachmentKey}.${exp}`, "base64url");
    const expired = await fetch(`${origin}/api/notice-attachments/${row.id}/content?exp=${exp}&sig=${sig}`);
    expect(expired.status).toBe(401);
    expect(((await expired.json()) as any).code).toBe("LINK_EXPIRED");

    // Drafts can swap their PDF (old links stop working); published notices cannot.
    const draft = await postNotice(SADIA, notice({ title: "Leave policy" }), pdf("Leave policy v1"));
    const oldUrl = draft.body.attachmentUrl;
    const swapped = await postNotice(SADIA, {}, pdf("Leave policy v2"), undefined, `/notices/${draft.body.id}/attachment`);
    expect(swapped.status).toBe(200);
    expect(swapped.body.attachment.name).toBe("Leave-policy-v2.pdf");
    expect((await fetch(`${origin}${oldUrl}`)).status).toBe(401);
    expect((await fetch(`${origin}${swapped.body.attachmentUrl}`)).status).toBe(200);
    expect((await postNotice(SADIA, {}, pdf("Late change"), undefined, `/notices/${res.body.id}/attachment`)).status).toBe(409);
  });

  test("unread counts follow what each person has opened", async () => {
    const before = (await get(FARHANA, "/notices/unread-count")).body;
    const res = await postNotice(SABINA, notice({ title: "Fire drill at Factory A on Sunday", channel: "ADMINISTRATION", urgent: "true", audience: "BRANCHES", branchIds: [await branchId("FCA")], publish: "true" }));
    const id = res.body.id;
    expect((await get(FARHANA, "/notices/unread-count")).body).toEqual({ unread: before.unread + 1, toAcknowledge: before.toAcknowledge + 1, urgentUnread: before.urgentUnread + 1 });
    expect(await boardIds(FARHANA, "&unread=true")).toContain(id);
    // Urgent notices rank straight after pinned ones.
    const top = (await get(FARHANA, "/notices?limit=50")).body.items;
    expect(top.findIndex((i: any) => i.id === id)).toBeLessThanOrEqual(top.filter((i: any) => i.pinned).length + top.filter((i: any) => i.urgent && !i.pinned).length);

    await get(FARHANA, `/notices/${id}`);
    expect((await get(FARHANA, "/notices/unread-count")).body).toEqual({ unread: before.unread, toAcknowledge: before.toAcknowledge + 1, urgentUnread: before.urgentUnread });
    expect(await boardIds(FARHANA, "&unread=true")).not.toContain(id);
    await send(FARHANA, "POST", `/notices/${id}/acknowledge`);
    expect((await get(FARHANA, "/notices/unread-count")).body.toAcknowledge).toBe(before.toAcknowledge);
    // Imran (Factory B) never saw it.
    expect(await boardIds(IMRAN, "&unread=true")).not.toContain(id);
  });

  test("the board pages through pinned, then urgent, then newest, without repeats", async () => {
    const rows: any[] = [];
    let cursor: string | null = null;
    do {
      const page = await get(RAHIM, `/notices?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      expect(page.body.items.length).toBeLessThanOrEqual(2);
      rows.push(...page.body.items);
      cursor = page.body.nextCursor;
    } while (cursor);
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows.map((r) => r.id)).toEqual(await boardIds(RAHIM));
    const rank = (r: any) => (r.pinned ? 2 : 0) + (r.urgent ? 1 : 0);
    for (let i = 1; i < rows.length; i++) {
      expect(rank(rows[i - 1])).toBeGreaterThanOrEqual(rank(rows[i]));
      if (rank(rows[i - 1]) === rank(rows[i])) expect(new Date(rows[i - 1].publishedAt).getTime()).toBeGreaterThanOrEqual(new Date(rows[i].publishedAt).getTime());
    }
    const hr = await get(RAHIM, "/notices?channel=HR&limit=50");
    expect(hr.body.items.length).toBeGreaterThan(0);
    expect(hr.body.items.every((i: any) => i.channel === "HR")).toBe(true);
    const search = await get(RAHIM, "/notices?q=foreign%20travel");
    expect(search.body.items.map((i: any) => i.title)).toEqual(["Foreign travel requires MD / Chairman sanction"]);
  });

  test("publishers see their own notices with counters; managers see every notice", async () => {
    const mine = await get(SADIA, "/admin/notices?status=PUBLISHED&limit=50");
    expect(mine.status).toBe(200);
    expect(mine.body.scope).toBe("MINE");
    const sadiaId = await userId(SADIA);
    expect(mine.body.items.length).toBeGreaterThan(0);
    expect(mine.body.items.every((i: any) => i.author.id === sadiaId)).toBe(true);
    expect(Object.keys(mine.body.items[0].counters).sort()).toEqual(["acknowledgedCount", "acknowledgedPct", "audienceSize", "readCount", "readPct"]);
    expect(mine.body.counts.DRAFT).toBeGreaterThanOrEqual(1);

    const all = await get(ARIF, "/admin/notices?status=PUBLISHED&limit=50");
    expect(all.body.scope).toBe("ALL");
    expect(new Set(all.body.items.map((i: any) => i.channel)).size).toBeGreaterThanOrEqual(5);
    const lpg = all.body.items.find((i: any) => i.title.includes("LPG"));
    expect(lpg.counters.audienceSize).toBe(await audienceOf(ARIF, ["FCA", "FCB"]));
    expect(lpg.counters.acknowledgedCount).toBeGreaterThan(0);
    expect(lpg.counters.acknowledgedCount).toBeLessThan(lpg.counters.audienceSize);
    expect(lpg.branches.map((b: any) => b.code).sort()).toEqual(["FCA", "FCB"]);
    expect((await get(RAHIM, "/admin/notices")).status).toBe(403);
  });

  test("the dashboard summary counts what is on the board and how well it is acknowledged", async () => {
    const now = new Date();
    const live = { status: "PUBLISHED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    const res = await get(ARIF, "/admin/notices/summary");
    expect(res.status).toBe(200);
    expect(res.body.published).toBe(await prisma.notice.count({ where: live }));
    expect(res.body.urgentActive).toBe(await prisma.notice.count({ where: { ...live, urgent: true } }));
    expect(res.body.drafts).toBe(await prisma.notice.count({ where: { status: "DRAFT" } }));
    expect(res.body.avgAcknowledgedPct).toBeGreaterThan(0);
    expect(res.body.avgAcknowledgedPct).toBeLessThanOrEqual(100);
    expect(res.body.latest).toHaveLength(5);
    const times = res.body.latest.map((l: any) => new Date(l.publishedAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(Object.keys(res.body.latest[0])).toEqual(expect.arrayContaining(["id", "referenceNumber", "title", "channel", "urgent", "publishedAt", "acknowledgedPct"]));

    const sadia = await get(SADIA, "/admin/notices/summary");
    expect(sadia.body.published).toBe(await prisma.notice.count({ where: { ...live, authorUserId: await userId(SADIA) } }));
    // Readers get the figures for what is addressed to them, and no drafts.
    const reader = await get(IMRAN, "/admin/notices/summary");
    expect(reader.status).toBe(200);
    expect(reader.body.drafts).toBe(0);
    expect(reader.body.latest.some((l: any) => l.title.startsWith("Factory A") || l.title.includes("Fire drill at Factory A"))).toBe(false);
  });

  test("a notice sent twice with the same Idempotency-Key is published once", async () => {
    const k = key("nb");
    const fields = notice({ title: "Prayer room relocated to level 3", publish: "true" });
    const a = await postNotice(SADIA, fields, undefined, k);
    const b = await postNotice(SADIA, fields, undefined, k);
    expect(a.status).toBe(201);
    expect(b.body.id).toBe(a.body.id);
    expect(await prisma.notice.count({ where: { title: "Prayer room relocated to level 3" } })).toBe(1);
  });
});
