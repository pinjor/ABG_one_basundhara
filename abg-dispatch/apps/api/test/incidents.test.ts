import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "path";
import { ANONYMOUS_REPORTER, CONFIDENTIAL_REPORTER, IncidentCategory, IncidentGroup } from "@abg-dispatch/shared";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const FARHANA = "farhana.islam@abg.com.bd"; // Factory A employee
const SHAHIN = "shahin.ahmed@abg.com.bd"; // Factory A employee
const RAHIM = "rahim@abg.com.bd"; // Head office employee
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin
const MD = "md@abg.com.bd"; // Managing Director (EXECUTIVE): reads every report, changes none
const AUDITOR = "mahmuda.akter@abg.com.bd";

const PHOTO = join(import.meta.dir, "..", "prisma", "demo-photos", "cracked-wall.jpg");

let baseUrl = "";
let origin = "";

/** Multipart POST /incidents, as the mobile app sends it. */
async function report(identifier: string, fields: Record<string, string>, photos: { name: string; data: Blob }[] = [], idempotencyKey?: string) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  for (const p of photos) form.append("photos", p.data, p.name);
  const headers: Record<string, string> = { authorization: `Bearer ${await login(identifier)}` };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
  const res = await fetch(`${baseUrl}/incidents`, { method: "POST", headers, body: form });
  return { status: res.status, body: (await res.json()) as any };
}

const jpeg = async () => ({ name: "wall.jpg", data: new Blob([await Bun.file(PHOTO).arrayBuffer()], { type: "image/jpeg" }) });

async function notificationsFor(identifier: string) {
  return (await api("GET", "/notifications?limit=50", { token: await login(identifier) })).body.items as any[];
}

async function move(identifier: string, id: string, body: Record<string, unknown>) {
  return api("POST", `/incidents/${id}/status`, { token: await login(identifier), body });
}

async function adminList(identifier: string, query: string) {
  const res = await api("GET", `/admin/incidents?limit=100&${query}`, { token: await login(identifier) });
  return { status: res.status, items: (res.body.items ?? []) as any[], body: res.body };
}

describe("incident & facility issues", () => {
  let incident: any;

  beforeAll(async () => {
    ({ baseUrl } = await startApp());
    origin = baseUrl.replace(/\/api$/, "");
    await resetAndSeed();
    clearTokens();
  });

  test("an employee reports a facility issue with a photo; the office's admins and head office are told at once", async () => {
    const res = await report(
      FARHANA,
      { title: "Dirty floor outside the QA lab", description: "Mud and oil near the lab door.", group: IncidentGroup.ADMIN_FACILITY, category: IncidentCategory.CLEANLINESS, severity: "HIGH", locationDetail: "QA lab door" },
      [await jpeg()],
    );
    expect(res.status).toBe(201);
    incident = res.body;
    expect(incident.referenceNumber).toMatch(/^INC-\d{6}-FCA-\d{3}$/);
    expect(incident).toMatchObject({ status: "REPORTED", group: "ADMIN_FACILITY", category: "CLEANLINESS", severity: "HIGH", confidential: false, anonymous: false, resolution: null });
    expect(incident.branch.code).toBe("FCA");
    expect(incident.photos).toHaveLength(1);
    expect(incident.viewer.isReporter).toBe(true);
    expect(incident.updates[0]).toMatchObject({ type: "SUBMITTED", toStatus: "REPORTED", actor: "You" });
    expect(incident.stages.map((s: any) => [s.status, s.state])).toEqual([
      ["REPORTED", "current"],
      ["ACKNOWLEDGED", "upcoming"],
      ["UNDER_INVESTIGATION", "upcoming"],
      ["CLOSED", "upcoming"],
    ]);
    expect(incident.stages[0].by).toBe("You");

    const sabina = (await notificationsFor(SABINA)).find((n) => n.data?.incidentId === incident.id);
    expect(sabina).toMatchObject({ category: "ACTION_REQUIRED", eventType: "INCIDENT_REPORTED", sensitive: false, title: "Urgent: Cleanliness reported at Factory A" });
    expect(sabina.body).toContain("Farhana Islam");
    expect(sabina.data.status).toBe("REPORTED");
    expect((await notificationsFor(ARIF)).some((n) => n.data?.incidentId === incident.id)).toBe(true);
    expect((await notificationsFor(TAHMINA)).some((n) => n.data?.incidentId === incident.id)).toBe(false);

    const mine = await api("GET", "/incidents/mine", { token: await login(FARHANA) });
    expect(mine.body.items[0]).toMatchObject({ id: incident.id, status: "REPORTED", group: "ADMIN_FACILITY", photoCount: 1, confidential: false });
  });

  test("the group comes from the sub-category; a sub-category from another group is refused", async () => {
    const bad = await report(FARHANA, { title: "Printer jams on every page", group: IncidentGroup.SAFETY_INDUSTRIAL, category: IncidentCategory.COMPUTER_PRINTER });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("CATEGORY_GROUP_MISMATCH");
    const ok = await report(FARHANA, { title: "Printer jams on every page", category: IncidentCategory.COMPUTER_PRINTER, severity: "LOW" });
    expect(ok.status).toBe(201);
    expect(ok.body).toMatchObject({ group: "IT_TECHNICAL", severity: "LOW" });
    const oldSeverity = await report(FARHANA, { title: "Old vocabulary", category: IncidentCategory.CLEANLINESS, severity: "URGENT" });
    expect(oldSeverity.status).toBe(400);
    const oldCategory = await report(FARHANA, { title: "Old vocabulary", category: "ELECTRICAL" });
    expect(oldCategory.status).toBe(400);
  });

  test("a Critical report is titled Critical for everyone who must act", async () => {
    const res = await report(SHAHIN, { title: "Smoke from the dryer motor on line 2", group: IncidentGroup.SAFETY_INDUSTRIAL, category: IncidentCategory.FIRE_HAZARD, severity: "CRITICAL" });
    expect(res.status).toBe(201);
    for (const who of [SABINA, ARIF]) {
      const n = (await notificationsFor(who)).find((x) => x.data?.incidentId === res.body.id);
      expect(n.title).toBe("Critical: Fire hazard reported at Factory A");
      expect(n.body).toContain("Safety & Industrial");
    }
  });

  test("photos are served only to the people involved, or through a short-lived signed link", async () => {
    const photo = incident.photos[0];
    const signed = await fetch(`${origin}${photo.url}`);
    expect(signed.status).toBe(200);
    expect(signed.headers.get("content-type")).toBe("image/jpeg");
    expect((await fetch(`${origin}${photo.url.replace(/sig=[^&]+/, "sig=forged")}`)).status).toBe(401);

    const path = `/incidents/${incident.id}/photos/${photo.id}/content`;
    expect((await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${await login(SABINA)}` } })).status).toBe(200);
    expect((await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${await login(RAHIM)}` } })).status).toBe(404);
  });

  test("admins take it Reported → Acknowledged → Under Investigation → Closed, and the reporter is told at every stage", async () => {
    const ack = await move(SABINA, incident.id, { status: "ACKNOWLEDGED", note: "Seen — cleaning team informed." });
    expect(ack.status).toBe(200);
    expect(ack.body).toMatchObject({ status: "ACKNOWLEDGED", statusNote: "Seen — cleaning team informed." });
    expect(ack.body.acknowledgedAt).toBeTruthy();
    expect(ack.body.viewer.actions).toEqual(expect.arrayContaining(["START_INVESTIGATION", "CLOSE", "ADD_NOTE", "EDIT_DETAILS"]));
    expect(ack.body.viewer.actions).not.toContain("ACKNOWLEDGE");

    const investigating = await move(SABINA, incident.id, { status: "UNDER_INVESTIGATION", note: "Cleaning team on the way." });
    expect(investigating.body.status).toBe("UNDER_INVESTIGATION");
    expect(investigating.body.investigationStartedAt).toBeTruthy();
    expect(investigating.body.viewer.actions).toContain("CLOSE");
    expect(investigating.body.viewer.actions).not.toContain("START_INVESTIGATION");

    const closed = await move(SABINA, incident.id, { status: "CLOSED", resolution: "RESOLVED", note: "Floor cleaned and a mat placed at the door." });
    expect(closed.status).toBe(200);
    expect(closed.body).toMatchObject({ status: "CLOSED", resolution: "RESOLVED" });
    expect(closed.body.closedAt).toBeTruthy();
    expect(closed.body.viewer.actions).toContain("REOPEN");
    expect(closed.body.viewer.actions).not.toContain("CLOSE");

    const seen = await api("GET", `/incidents/${incident.id}`, { token: await login(FARHANA) });
    expect(seen.body.updates.map((u: any) => u.toStatus)).toEqual(["REPORTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "CLOSED"]);
    expect(seen.body.updates[3]).toMatchObject({ actor: "Sabina Yasmin", note: "Floor cleaned and a mat placed at the door.", metadata: { resolution: "RESOLVED" } });
    expect(seen.body.stages.map((s: any) => [s.status, s.state, s.by])).toEqual([
      ["REPORTED", "done", "You"],
      ["ACKNOWLEDGED", "done", "Sabina Yasmin"],
      ["UNDER_INVESTIGATION", "done", "Sabina Yasmin"],
      ["CLOSED", "done", "Sabina Yasmin"],
    ]);
    expect(seen.body.stages[3].resolution).toBe("RESOLVED");
    expect(seen.body.viewer.actions).not.toContain("ADD_PHOTO");

    const told = (await notificationsFor(FARHANA)).filter((n) => n.data?.incidentId === incident.id);
    expect(told.map((n) => n.title)).toEqual(expect.arrayContaining(["Your report has been acknowledged", "Your report is under investigation", "Your report has been resolved"]));
    expect(told.find((n) => n.title === "Your report has been resolved").data.status).toBe("CLOSED");
  });

  test("closing needs a resolution, and every resolution but Resolved needs a note for the reporter", async () => {
    const other = (await report(FARHANA, { title: "Bin overflowing near the gate", category: IncidentCategory.CLEANLINESS })).body;
    const noResolution = await move(SABINA, other.id, { status: "CLOSED", note: "Emptied." });
    expect(noResolution.status).toBe(400);
    expect(noResolution.body.code).toBe("RESOLUTION_REQUIRED");
    for (const resolution of ["NO_ACTION_NEEDED", "DUPLICATE", "REFERRED"]) {
      const noNote = await move(SABINA, other.id, { status: "CLOSED", resolution });
      expect(noNote.status).toBe(400);
      expect(noNote.body.code).toBe("REASON_REQUIRED");
    }
    expect((await move(SABINA, other.id, { status: "CLOSED", resolution: "REFERRED", note: "x" })).body.code).toBe("REASON_REQUIRED");
    expect((await move(SABINA, other.id, { status: "ACKNOWLEDGED", resolution: "RESOLVED" })).body.code).toBe("RESOLUTION_NOT_ALLOWED");
    expect((await move(SABINA, other.id, { status: "CLOSED", resolution: "DECLINED", note: "Old vocabulary" })).status).toBe(400);
    expect((await move(SABINA, other.id, { status: "DONE" })).status).toBe(400);

    const dup = await move(SABINA, other.id, { status: "CLOSED", resolution: "DUPLICATE", note: "Already reported this morning; handled there." });
    expect(dup.status).toBe(200);
    expect(dup.body).toMatchObject({ status: "CLOSED", resolution: "DUPLICATE" });
    // Closed straight from Reported: it was acknowledged by the close, and the investigation was skipped.
    expect(dup.body.acknowledgedAt).toBeTruthy();
    expect(dup.body.investigationStartedAt).toBeNull();
    expect(dup.body.stages.map((s: any) => s.state)).toEqual(["done", "done", "skipped", "done"]);
    const told = (await notificationsFor(FARHANA)).find((n) => n.data?.incidentId === other.id && n.eventType === "INCIDENT_UPDATED");
    expect(told.title).toBe("Your report was closed as a duplicate");
    expect(told.body).toContain("Already reported this morning");

    // Resolved needs no note.
    const quick = (await report(FARHANA, { title: "Light out in the stairwell", category: IncidentCategory.FURNITURE_FIXTURES, severity: "LOW" })).body;
    expect((await move(SABINA, quick.id, { status: "CLOSED", resolution: "RESOLVED" })).body).toMatchObject({ status: "CLOSED", resolution: "RESOLVED" });
  });

  test("stages only move forward; a closed report reopens into Under Investigation", async () => {
    const before = (await api("GET", `/incidents/${incident.id}`, { token: await login(SABINA) })).body;
    for (const status of ["ACKNOWLEDGED", "CLOSED", "REPORTED"]) {
      const res = await move(SABINA, incident.id, status === "CLOSED" ? { status, resolution: "RESOLVED" } : { status });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("INCIDENT_STATE_CONFLICT");
    }
    const reopened = await move(SABINA, incident.id, { status: "UNDER_INVESTIGATION", note: "Mud is back after the rain." });
    expect(reopened.status).toBe(200);
    expect(reopened.body).toMatchObject({ status: "UNDER_INVESTIGATION", closedAt: null, resolution: null, acknowledgedAt: before.acknowledgedAt, investigationStartedAt: before.investigationStartedAt });
    expect(reopened.body.updates.at(-1)).toMatchObject({ fromStatus: "CLOSED", toStatus: "UNDER_INVESTIGATION", metadata: { reopened: true } });
    expect(reopened.body.stages.map((s: any) => s.state)).toEqual(["done", "done", "current", "upcoming"]);
    expect((await notificationsFor(FARHANA)).some((n) => n.data?.incidentId === incident.id && n.title === "Your report was reopened")).toBe(true);
    expect((await move(SABINA, incident.id, { status: "ACKNOWLEDGED" })).status).toBe(409);
    const again = await move(SABINA, incident.id, { status: "CLOSED", resolution: "NO_ACTION_NEEDED", note: "The mud is from the road works; the contractor sweeps daily." });
    expect(again.body).toMatchObject({ status: "CLOSED", resolution: "NO_ACTION_NEEDED" });
  });

  test("an anonymous report hides the reporter from everyone handling it, but stays with the office and the reporter still follows it", async () => {
    const res = await report(SHAHIN, { title: "Canteen staff not wearing gloves", category: IncidentCategory.CAFETERIA_HYGIENE, anonymous: "true" });
    expect(res.status).toBe(201);
    const id = res.body.id;
    expect(res.body).toMatchObject({ anonymous: true, confidential: false });

    const asAdmin = await api("GET", `/incidents/${id}`, { token: await login(SABINA) });
    expect(asAdmin.body.reporter).toBeNull();
    expect(asAdmin.body.updates[0].actor).toBe(ANONYMOUS_REPORTER);
    expect(asAdmin.body.stages[0].by).toBe(ANONYMOUS_REPORTER);
    expect(JSON.stringify(asAdmin.body)).not.toContain("Shahin");

    const list = await adminList(SABINA, "status=ALL");
    expect(list.items.find((i) => i.id === id).reporterName).toBeNull();
    const search = await adminList(SABINA, "q=Shahin");
    expect(search.items.some((i) => i.id === id)).toBe(false);
    const note = (await notificationsFor(SABINA)).find((n) => n.data?.incidentId === id);
    expect(note.body).not.toContain("Shahin");

    const own = await api("GET", `/incidents/${id}`, { token: await login(SHAHIN) });
    expect(own.body.reporter.name).toBe("Shahin Ahmed");
    expect(own.body.viewer.isReporter).toBe(true);
  });

  test("a confidential report reaches head office only and hides the reporter from everyone handling it", async () => {
    const res = await report(FARHANA, { title: "Diesel going missing from the generator store", category: IncidentCategory.THEFT_LOSS, severity: "HIGH", confidential: "true" }, [await jpeg()]);
    expect(res.status).toBe(201);
    const id = res.body.id;
    expect(res.body).toMatchObject({ confidential: true, anonymous: false, group: "SECURITY" });
    expect(res.body.reporter.name).toBe("Farhana Islam");

    // Not the office's own admins: not by id, not in the list, not in their inbox.
    expect((await api("GET", `/incidents/${id}`, { token: await login(SABINA) })).status).toBe(404);
    expect((await adminList(SABINA, "status=ALL")).items.some((i) => i.id === id)).toBe(false);
    expect((await notificationsFor(SABINA)).some((n) => n.data?.incidentId === id)).toBe(false);
    // Not auditors either.
    expect((await api("GET", `/incidents/${id}`, { token: await login(AUDITOR) })).status).toBe(404);

    const arifNote = (await notificationsFor(ARIF)).find((n) => n.data?.incidentId === id);
    expect(arifNote).toMatchObject({ sensitive: true, title: "Urgent: New confidential report at Factory A" });
    expect(arifNote.body).not.toContain("Diesel");
    expect(arifNote.body).not.toContain("Farhana");

    const asArif = await api("GET", `/incidents/${id}`, { token: await login(ARIF) });
    expect(asArif.status).toBe(200);
    expect(asArif.body.reporter).toBeNull();
    expect(asArif.body.updates[0].actor).toBe(CONFIDENTIAL_REPORTER);
    expect(asArif.body.stages[0].by).toBe(CONFIDENTIAL_REPORTER);
    expect(JSON.stringify(asArif.body)).not.toContain("Farhana");
    expect((await adminList(ARIF, "q=Farhana")).items.some((i) => i.id === id)).toBe(false);
    expect((await adminList(ARIF, "status=ALL")).items.find((i) => i.id === id)).toMatchObject({ confidential: true, reporterName: null, reporterCode: null });

    // The MD reads it but cannot change it.
    const asMd = await api("GET", `/incidents/${id}`, { token: await login(MD) });
    expect(asMd.status).toBe(200);
    expect(asMd.body.viewer).toMatchObject({ isStaff: true, canManage: false, actions: [] });
    expect((await move(MD, id, { status: "ACKNOWLEDGED" })).status).toBe(403);

    // The reporter follows it, and its updates stay off the lock screen.
    await move(ARIF, id, { status: "ACKNOWLEDGED", note: "Head office is looking into this." });
    const told = (await notificationsFor(FARHANA)).find((n) => n.data?.incidentId === id && n.eventType === "INCIDENT_UPDATED");
    expect(told).toMatchObject({ sensitive: true, title: "Your report has been acknowledged" });
    const mine = await api("GET", "/incidents/mine?state=open", { token: await login(FARHANA) });
    expect(mine.body.items.find((i: any) => i.id === id)).toMatchObject({ confidential: true, reporterName: "Farhana Islam" });
  });

  test("misconduct is always confidential, whatever the form says", async () => {
    const res = await report(FARHANA, { title: "Store keeper selling scrap privately", category: IncidentCategory.MISCONDUCT, confidential: "false", anonymous: "true" });
    expect(res.status).toBe(201);
    const id = res.body.id;
    expect(res.body).toMatchObject({ confidential: true, anonymous: true, group: "SECURITY" });
    expect((await api("GET", `/incidents/${id}`, { token: await login(SABINA) })).status).toBe(404);
    expect((await notificationsFor(SABINA)).some((n) => n.data?.incidentId === id)).toBe(false);
    const arif = (await notificationsFor(ARIF)).find((n) => n.data?.incidentId === id);
    expect(arif.sensitive).toBe(true);
    expect(arif.body).not.toContain("scrap");
    const asArif = await api("GET", `/incidents/${id}`, { token: await login(ARIF) });
    expect(asArif.body.updates[0].actor).toBe(ANONYMOUS_REPORTER);
    const unconfidential = await api("PATCH", `/incidents/${id}`, { token: await login(ARIF), body: { confidential: false } });
    expect(unconfidential.status).toBe(400);
    expect(unconfidential.body.code).toBe("CONFIDENTIAL_REQUIRED");
  });

  test("marking a report confidential hands it to head office; taking it back out keeps the reporter hidden", async () => {
    const id = (await report(SHAHIN, { title: "Diesel taken home in jerrycans", category: IncidentCategory.THEFT_LOSS })).body.id;
    expect((await api("GET", `/incidents/${id}`, { token: await login(SABINA) })).body.reporter.name).toBe("Shahin Ahmed");

    const moved = await api("PATCH", `/incidents/${id}`, { token: await login(SABINA), body: { confidential: true } });
    expect(moved.status).toBe(200);
    expect(moved.body).toEqual({ id, movedToHeadOffice: true });
    expect((await api("GET", `/incidents/${id}`, { token: await login(SABINA) })).status).toBe(404);
    const handed = (await notificationsFor(ARIF)).filter((n) => n.data?.incidentId === id);
    expect(handed.some((n) => n.sensitive && n.title === "New confidential report at Factory A")).toBe(true);

    // Head office never sees the name, even though the report was first filed openly.
    const asArif = await api("GET", `/incidents/${id}`, { token: await login(ARIF) });
    expect(asArif.body.reporter).toBeNull();
    expect(asArif.body.updates[0].actor).toBe(CONFIDENTIAL_REPORTER);
    expect(JSON.stringify(asArif.body)).not.toContain("Shahin");

    const shared = await api("PATCH", `/incidents/${id}`, { token: await login(ARIF), body: { confidential: false } });
    expect(shared.status).toBe(200);
    expect(shared.body).toMatchObject({ confidential: false, anonymous: true });
    expect(shared.body.updates.at(-1)).toMatchObject({ type: "DETAILS_CHANGED", metadata: { confidential: { before: true, after: false }, anonymous: { before: false, after: true } } });
    const asSabina = await api("GET", `/incidents/${id}`, { token: await login(SABINA) });
    expect(asSabina.status).toBe(200);
    expect(asSabina.body.reporter).toBeNull();
    expect(asSabina.body.updates[0].actor).toBe(ANONYMOUS_REPORTER);
    expect(JSON.stringify(asSabina.body)).not.toContain("Shahin");
    expect((await notificationsFor(SABINA)).filter((n) => n.data?.incidentId === id).length).toBe(2);
  });

  test("admins correct the group, sub-category and severity; every change is kept in the history", async () => {
    const id = (await report(FARHANA, { title: "Hot and stuffy in the QA lab", category: IncidentCategory.CLEANLINESS })).body.id;
    const sabina = await login(SABINA);
    const groupOnly = await api("PATCH", `/incidents/${id}`, { token: sabina, body: { group: "IT_TECHNICAL" } });
    expect(groupOnly.status).toBe(400);
    expect(groupOnly.body.code).toBe("CATEGORY_REQUIRED");
    const mismatch = await api("PATCH", `/incidents/${id}`, { token: sabina, body: { group: "IT_TECHNICAL", category: "AC_VENTILATION" } });
    expect(mismatch.body.code).toBe("CATEGORY_GROUP_MISMATCH");

    const fixed = await api("PATCH", `/incidents/${id}`, { token: sabina, body: { category: "AC_VENTILATION", severity: "CRITICAL" } });
    expect(fixed.status).toBe(200);
    expect(fixed.body).toMatchObject({ group: "ADMIN_FACILITY", category: "AC_VENTILATION", severity: "CRITICAL" });
    const regrouped = await api("PATCH", `/incidents/${id}`, { token: sabina, body: { group: "IT_TECHNICAL", category: "POWER_UPS" } });
    expect(regrouped.body).toMatchObject({ group: "IT_TECHNICAL", category: "POWER_UPS" });
    const edits = regrouped.body.updates.filter((u: any) => u.type === "DETAILS_CHANGED");
    expect(edits[0].metadata).toEqual({ category: { before: "CLEANLINESS", after: "AC_VENTILATION" }, severity: { before: "MEDIUM", after: "CRITICAL" } });
    expect(edits[1].metadata).toEqual({ group: { before: "ADMIN_FACILITY", after: "IT_TECHNICAL" }, category: { before: "AC_VENTILATION", after: "POWER_UPS" } });
    expect((await api("PATCH", `/incidents/${id}`, { token: await login(FARHANA), body: { severity: "LOW" } })).status).toBe(403);
  });

  test("the admin list filters by group, stage, severity, resolution and confidentiality", async () => {
    const it = await adminList(ARIF, "status=ALL&group=IT_TECHNICAL");
    expect(it.items.length).toBeGreaterThanOrEqual(3);
    expect(it.items.every((i) => i.group === "IT_TECHNICAL")).toBe(true);

    const safety = await adminList(SABINA, "status=ALL&group=SAFETY_INDUSTRIAL");
    expect(safety.items.some((i) => i.title === "Strong smell of gas near the boiler room")).toBe(true);
    expect(safety.items.every((i) => i.group === "SAFETY_INDUSTRIAL" && i.branch.code === "FCA")).toBe(true);

    const confidential = await adminList(ARIF, "status=ALL&confidential=true");
    expect(confidential.items.length).toBeGreaterThanOrEqual(4);
    expect(confidential.items.every((i) => i.confidential)).toBe(true);
    expect(confidential.items.some((i) => i.title === "Supplier asking staff for cash to speed up deliveries")).toBe(true);
    expect((await adminList(SABINA, "status=ALL&confidential=true")).items).toEqual([]);

    const open = await adminList(ARIF, "status=OPEN");
    expect(open.items.length).toBeGreaterThan(0);
    expect(open.items.some((i) => i.status === "CLOSED")).toBe(false);
    const duplicates = await adminList(ARIF, "status=CLOSED&resolution=DUPLICATE");
    expect(duplicates.items.length).toBeGreaterThanOrEqual(2);
    expect(duplicates.items.every((i) => i.status === "CLOSED" && i.resolution === "DUPLICATE")).toBe(true);
    const critical = await adminList(ARIF, "status=ALL&severity=CRITICAL");
    expect(critical.items.every((i) => i.severity === "CRITICAL")).toBe(true);
    const reported = await adminList(SABINA, "status=REPORTED");
    expect(reported.items.every((i) => i.status === "REPORTED")).toBe(true);

    expect((await adminList(ARIF, "group=FACILITY")).status).toBe(400);
    expect((await adminList(ARIF, "status=PENDING")).status).toBe(400);
  });

  test("people unrelated to a report cannot see it; auditors and the MD can read but not change it", async () => {
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(RAHIM) })).status).toBe(404);
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(TAHMINA) })).status).toBe(404);
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(AUDITOR) })).status).toBe(200);
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(MD) })).status).toBe(200);
    expect((await move(AUDITOR, incident.id, { status: "UNDER_INVESTIGATION" })).status).toBe(403);
    expect((await move(FARHANA, incident.id, { status: "UNDER_INVESTIGATION" })).status).toBe(403);
    expect((await api("GET", "/admin/incidents", { token: await login(RAHIM) })).status).toBe(403);
  });

  test("only images are accepted, at most three per report", async () => {
    const fake = { name: "photo.jpg", data: new Blob(["this is not an image at all"], { type: "image/jpeg" }) };
    const bad = await report(FARHANA, { title: "Broken window", category: IncidentCategory.BUILDING_DAMAGE }, [fake]);
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe("PHOTO_TYPE");
    const photo = await jpeg();
    const tooMany = await report(FARHANA, { title: "Broken window", category: IncidentCategory.BUILDING_DAMAGE }, [photo, photo, photo, photo]);
    expect(tooMany.status).toBe(400);
  });

  test("a report sent twice with the same Idempotency-Key is recorded once", async () => {
    const k = key("inc");
    const a = await report(RAHIM, { title: "Lift 3 stuck between floors", category: IncidentCategory.MACHINERY_FAULT, severity: "CRITICAL" }, [], k);
    const b = await report(RAHIM, { title: "Lift 3 stuck between floors", category: IncidentCategory.MACHINERY_FAULT, severity: "CRITICAL" }, [], k);
    expect(a.status).toBe(201);
    expect(b.body.id).toBe(a.body.id);
  });

  test("an incident's history cannot be altered, even with direct SQL", async () => {
    const { prisma } = await startApp();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "incident_updates" SET "note" = 'edited' WHERE "incidentId" = '${incident.id}'`))).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`DELETE FROM "incident_updates" WHERE "incidentId" = '${incident.id}'`))).rejects.toThrow();
    // The database also refuses a closed report without a resolution, and a group that doesn't match the sub-category.
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "incidents" SET "resolution" = NULL WHERE "id" = '${incident.id}'`))).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "incidents" SET "group" = 'IT_TECHNICAL' WHERE "id" = '${incident.id}'`))).rejects.toThrow();
  });

  test("the summary gives stage counts, open by group, critical and urgent counts and the recent log, in the viewer's scope", async () => {
    const sabina = await api("GET", "/admin/incidents/summary", { token: await login(SABINA) });
    expect(sabina.status).toBe(200);
    const s = sabina.body;
    expect(Object.keys(s)).toEqual(["counts", "open", "criticalOpen", "urgentOpen", "byGroupOpen", "oldestReportedAt", "closedLast30Days", "avgHoursToClose", "recent"]);
    expect(Object.keys(s.counts)).toEqual(["REPORTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "CLOSED"]);
    expect(Object.keys(s.byGroupOpen)).toEqual(["SAFETY_INDUSTRIAL", "ADMIN_FACILITY", "SECURITY", "IT_TECHNICAL"]);
    expect(s.open).toBe(s.counts.REPORTED + s.counts.ACKNOWLEDGED + s.counts.UNDER_INVESTIGATION);
    expect(Object.values(s.byGroupOpen as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(s.open);
    // The seeded gas leak and the dryer fire are both Critical and open at Factory A.
    expect(s.criticalOpen).toBeGreaterThanOrEqual(2);
    expect(s.urgentOpen).toBeGreaterThanOrEqual(s.criticalOpen);
    expect(s.oldestReportedAt).toBeTruthy();
    expect(s.closedLast30Days).toBeGreaterThanOrEqual(3);
    expect(typeof s.avgHoursToClose).toBe("number");
    // Matches the list for the same scope.
    expect(s.counts.REPORTED).toBe((await adminList(SABINA, "status=REPORTED")).items.length);
    expect(s.open).toBe((await adminList(SABINA, "status=OPEN")).items.length);

    expect(s.recent).toHaveLength(6);
    expect(Object.keys(s.recent[0]).sort()).toEqual(["branch", "category", "confidential", "createdAt", "group", "id", "referenceNumber", "severity", "status", "title"].sort());
    expect(Object.keys(s.recent[0].branch).sort()).toEqual(["code", "name"]);
    const times = s.recent.map((r: any) => new Date(r.createdAt).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(s.recent.every((r: any) => r.branch.code === "FCA" && !r.confidential)).toBe(true);

    // Head office and the MD see everything, confidential reports included.
    const arif = (await api("GET", "/admin/incidents/summary", { token: await login(ARIF) })).body;
    const md = (await api("GET", "/admin/incidents/summary", { token: await login(MD) })).body;
    expect(arif.open).toBeGreaterThan(s.open);
    expect(md.counts).toEqual(arif.counts);
    expect(md.recent.map((r: any) => r.id)).toEqual(arif.recent.map((r: any) => r.id));
    const confidentialOpen = (await adminList(ARIF, "status=OPEN&confidential=true")).items.length;
    const auditor = (await api("GET", "/admin/incidents/summary", { token: await login(AUDITOR) })).body;
    expect(auditor.open).toBe(arif.open - confidentialOpen);

    // One office, one group.
    const { prisma } = await startApp();
    const fcb = await prisma.branch.findUniqueOrThrow({ where: { code: "FCB" } });
    const byOffice = (await api("GET", `/admin/incidents/summary?branchId=${fcb.id}`, { token: await login(ARIF) })).body;
    expect(byOffice.recent.every((r: any) => r.branch.code === "FCB")).toBe(true);
    const security = (await api("GET", "/admin/incidents/summary?group=SECURITY", { token: await login(ARIF) })).body;
    expect(security.byGroupOpen).toMatchObject({ SAFETY_INDUSTRIAL: 0, ADMIN_FACILITY: 0, IT_TECHNICAL: 0 });
    expect(security.recent.every((r: any) => r.group === "SECURITY")).toBe(true);
    expect((await api("GET", "/admin/incidents/summary?branchId=", { token: await login(ARIF) })).status).toBe(200);

    expect((await api("GET", "/admin/incidents/summary", { token: await login(RAHIM) })).status).toBe(403);
  });
});
