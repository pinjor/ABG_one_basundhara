import { beforeAll, describe, expect, test } from "bun:test";
import { join } from "path";
import { ANONYMOUS_REPORTER, IncidentCategory } from "@abg-dispatch/shared";
import { api, clearTokens, key, login, resetAndSeed, startApp } from "./helpers";

const FARHANA = "farhana.islam@abg.com.bd"; // Factory A employee
const SHAHIN = "shahin.ahmed@abg.com.bd"; // Factory A employee
const RAHIM = "rahim@abg.com.bd"; // Head office employee
const SABINA = "sabina.yasmin@abg.com.bd"; // Factory A branch admin
const TAHMINA = "tahmina.begum@abg.com.bd"; // Factory B branch admin
const ARIF = "arif.chowdhury@abg.com.bd"; // Head office admin
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

describe("workplace incident reports", () => {
  let incident: any;

  beforeAll(async () => {
    ({ baseUrl } = await startApp());
    origin = baseUrl.replace(/\/api$/, "");
    await resetAndSeed();
    clearTokens();
  });

  test("an employee reports a problem with a photo; the office's admins are told at once", async () => {
    const res = await report(FARHANA, { title: "Dirty floor outside the QA lab", description: "Mud and oil near the lab door.", category: IncidentCategory.CLEANLINESS, severity: "HIGH", locationDetail: "QA lab door" }, [await jpeg()]);
    expect(res.status).toBe(201);
    incident = res.body;
    expect(incident.referenceNumber).toMatch(/^INC-\d{6}-FCA-\d{3}$/);
    expect(incident.status).toBe("PENDING");
    expect(incident.branch.code).toBe("FCA");
    expect(incident.photos).toHaveLength(1);
    expect(incident.viewer.isReporter).toBe(true);
    expect(incident.updates[0]).toMatchObject({ type: "SUBMITTED", actor: "You" });

    const sabina = (await notificationsFor(SABINA)).find((n) => n.data?.incidentId === incident.id);
    expect(sabina).toMatchObject({ category: "ACTION_REQUIRED", eventType: "INCIDENT_REPORTED" });
    expect(sabina.body).toContain("Farhana Islam");
    expect((await notificationsFor(ARIF)).some((n) => n.data?.incidentId === incident.id)).toBe(true);
    expect((await notificationsFor(TAHMINA)).some((n) => n.data?.incidentId === incident.id)).toBe(false);

    const mine = await api("GET", "/incidents/mine", { token: await login(FARHANA) });
    expect(mine.body.items[0]).toMatchObject({ id: incident.id, status: "PENDING", photoCount: 1 });
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

  test("admins move it to Processing and then Done, and the reporter is told each time", async () => {
    const sabina = await login(SABINA);
    const processing = await api("POST", `/incidents/${incident.id}/status`, { token: sabina, body: { status: "PROCESSING", note: "Cleaning team sent." } });
    expect(processing.status).toBe(200);
    expect(processing.body).toMatchObject({ status: "PROCESSING", statusNote: "Cleaning team sent." });

    const done = await api("POST", `/incidents/${incident.id}/status`, { token: sabina, body: { status: "DONE", note: "Floor cleaned and mat placed at the door." } });
    expect(done.body.status).toBe("DONE");
    expect(done.body.doneAt).toBeTruthy();

    const seen = await api("GET", `/incidents/${incident.id}`, { token: await login(FARHANA) });
    expect(seen.body.updates.map((u: any) => u.toStatus)).toEqual(["PENDING", "PROCESSING", "DONE"]);
    expect(seen.body.updates[2]).toMatchObject({ actor: "Sabina Yasmin", note: "Floor cleaned and mat placed at the door." });

    const told = (await notificationsFor(FARHANA)).filter((n) => n.data?.incidentId === incident.id).map((n) => n.title);
    expect(told).toContain("Your report is being processed");
    expect(told).toContain("Your report has been resolved");
  });

  test("status changes follow the rules: no skipping back, declining needs a reason, done can be reopened", async () => {
    const sabina = await login(SABINA);
    const back = await api("POST", `/incidents/${incident.id}/status`, { token: sabina, body: { status: "DECLINED", note: "n/a" } });
    expect(back.status).toBe(409);
    const reopened = await api("POST", `/incidents/${incident.id}/status`, { token: sabina, body: { status: "PROCESSING", note: "Mud is back after the rain." } });
    expect(reopened.body).toMatchObject({ status: "PROCESSING", doneAt: null });

    const other = (await report(FARHANA, { title: "Bin overflowing near gate", category: IncidentCategory.CLEANLINESS })).body;
    const noReason = await api("POST", `/incidents/${other.id}/status`, { token: sabina, body: { status: "DECLINED" } });
    expect(noReason.status).toBe(400);
    expect(noReason.body.code).toBe("REASON_REQUIRED");
  });

  test("an anonymous report hides the reporter from everyone handling it, but the reporter still follows it", async () => {
    const res = await report(SHAHIN, { title: "Canteen staff not wearing gloves", category: IncidentCategory.CAFETERIA_HYGIENE, anonymous: "true" });
    expect(res.status).toBe(201);
    const id = res.body.id;

    const asAdmin = await api("GET", `/incidents/${id}`, { token: await login(SABINA) });
    expect(asAdmin.body.anonymous).toBe(true);
    expect(asAdmin.body.reporter).toBeNull();
    expect(asAdmin.body.updates[0].actor).toBe(ANONYMOUS_REPORTER);
    expect(JSON.stringify(asAdmin.body)).not.toContain("Shahin");

    const list = await api("GET", "/admin/incidents?limit=100", { token: await login(SABINA) });
    expect(list.body.items.find((i: any) => i.id === id).reporterName).toBeNull();
    const search = await api("GET", "/admin/incidents?q=Shahin", { token: await login(SABINA) });
    expect(search.body.items.some((i: any) => i.id === id)).toBe(false);
    const note = (await notificationsFor(SABINA)).find((n) => n.data?.incidentId === id);
    expect(note.body).not.toContain("Shahin");

    const own = await api("GET", `/incidents/${id}`, { token: await login(SHAHIN) });
    expect(own.body.reporter.name).toBe("Shahin Ahmed");
    expect(own.body.viewer.isReporter).toBe(true);
  });

  test("misconduct reports go to head office only, never to the office's own admins", async () => {
    const res = await report(FARHANA, { title: "Store keeper selling scrap privately", category: IncidentCategory.MISCONDUCT, anonymous: "true" });
    const id = res.body.id;
    expect((await api("GET", `/incidents/${id}`, { token: await login(SABINA) })).status).toBe(404);
    const sabinaList = await api("GET", "/admin/incidents?limit=100", { token: await login(SABINA) });
    expect(sabinaList.body.items.some((i: any) => i.id === id)).toBe(false);
    expect((await notificationsFor(SABINA)).some((n) => n.data?.incidentId === id)).toBe(false);

    const arif = (await notificationsFor(ARIF)).find((n) => n.data?.incidentId === id);
    expect(arif.sensitive).toBe(true);
    expect(arif.body).not.toContain("scrap");
    expect((await api("GET", `/incidents/${id}`, { token: await login(ARIF) })).status).toBe(200);
  });

  test("people unrelated to a report cannot see it; auditors can read but not change it", async () => {
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(RAHIM) })).status).toBe(404);
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(TAHMINA) })).status).toBe(404);
    expect((await api("GET", `/incidents/${incident.id}`, { token: await login(AUDITOR) })).status).toBe(200);
    expect((await api("POST", `/incidents/${incident.id}/status`, { token: await login(AUDITOR), body: { status: "DONE" } })).status).toBe(403);
    expect((await api("POST", `/incidents/${incident.id}/status`, { token: await login(FARHANA), body: { status: "DONE" } })).status).toBe(403);
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
    const a = await report(RAHIM, { title: "Lift 3 stuck between floors", category: IncidentCategory.SAFETY_HAZARD }, [], k);
    const b = await report(RAHIM, { title: "Lift 3 stuck between floors", category: IncidentCategory.SAFETY_HAZARD }, [], k);
    expect(a.status).toBe(201);
    expect(b.body.id).toBe(a.body.id);
  });

  test("an incident's history cannot be altered, even with direct SQL", async () => {
    const { prisma } = await startApp();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`UPDATE "incident_updates" SET "note" = 'edited' WHERE "incidentId" = '${incident.id}'`))).rejects.toThrow();
    await expect(Promise.resolve(prisma.$executeRawUnsafe(`DELETE FROM "incident_updates" WHERE "incidentId" = '${incident.id}'`))).rejects.toThrow();
  });

  test("the admin summary counts open reports in the viewer's offices", async () => {
    const res = await api("GET", "/admin/incidents/summary", { token: await login(SABINA) });
    expect(res.status).toBe(200);
    expect(res.body.open).toBeGreaterThanOrEqual(2);
    expect(Object.keys(res.body.counts)).toEqual(["PENDING", "PROCESSING", "DONE", "DECLINED"]);
  });
});
