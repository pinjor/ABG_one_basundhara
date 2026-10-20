import { describe, expect, test } from "bun:test";
import {
  Capability,
  Classification,
  ParcelStatus,
  RoleCode,
  STATUS_LABEL,
  STATUS_TRANSITIONS,
  STATUS_VIEW_STATUSES,
  ViewerRelation,
  canTransition,
  capabilitiesFor,
  contentAccess,
  extractQrToken,
  formatTrackingNumber,
  isTerminal,
  isTrackingNumber,
  maskPhone,
  notificationSubject,
} from "./index";

describe("parcel state machine", () => {
  test("follows the happy path one step at a time", () => {
    expect(canTransition("BOOKED", "AWAITING_PICKUP")).toBe(true);
    expect(canTransition("AWAITING_PICKUP", "PICKED_UP")).toBe(true);
    expect(canTransition("PICKED_UP", "IN_TRANSIT")).toBe(true);
    expect(canTransition("IN_TRANSIT", "ARRIVED_AT_DESTINATION")).toBe(true);
    expect(canTransition("ARRIVED_AT_DESTINATION", "PENDING_RECEIPT")).toBe(true);
    expect(canTransition("PENDING_RECEIPT", "RECEIVED")).toBe(true);
  });

  test("arrival never counts as receipt", () => {
    expect(canTransition("ARRIVED_AT_DESTINATION", "RECEIVED")).toBe(false);
    expect(canTransition("IN_TRANSIT", "RECEIVED")).toBe(false);
  });

  test("nothing can skip straight to RECEIVED except PENDING_RECEIPT", () => {
    const from = (Object.keys(STATUS_TRANSITIONS) as ParcelStatus[]).filter((s) =>
      STATUS_TRANSITIONS[s].includes("RECEIVED"),
    );
    expect(from).toEqual(["PENDING_RECEIPT"]);
  });

  test("terminal states have no exits", () => {
    for (const s of ["RECEIVED", "RETURNED", "CANCELLED"] as ParcelStatus[]) {
      expect(isTerminal(s)).toBe(true);
      expect(STATUS_TRANSITIONS[s]).toHaveLength(0);
    }
  });

  test("a parcel in a carrier's hands cannot be cancelled, only returned", () => {
    expect(canTransition("IN_TRANSIT", "CANCELLED")).toBe(false);
    expect(canTransition("IN_TRANSIT", "RETURN_REQUESTED")).toBe(true);
  });

  test("every status has a label and appears in the transition table", () => {
    for (const s of Object.values(ParcelStatus)) {
      expect(STATUS_LABEL[s]).toBeTruthy();
      expect(STATUS_TRANSITIONS[s]).toBeDefined();
    }
  });

  test("every transition target is a real status", () => {
    const all = new Set(Object.values(ParcelStatus));
    for (const targets of Object.values(STATUS_TRANSITIONS)) for (const t of targets) expect(all.has(t)).toBe(true);
  });

  test("In Route view never includes received parcels", () => {
    expect(STATUS_VIEW_STATUSES.IN_ROUTE).not.toContain("RECEIVED");
    expect(STATUS_VIEW_STATUSES.PENDING_RECEIPT).toContain("PENDING_RECEIPT");
  });
});

describe("role capabilities", () => {
  test("auditors can read everything but change nothing", () => {
    const caps = capabilitiesFor([RoleCode.AUDITOR]);
    expect(caps.has(Capability.PARCEL_VIEW_ALL)).toBe(true);
    expect(caps.has(Capability.PARCEL_CREATE)).toBe(false);
    expect(caps.has(Capability.PARCEL_CORRECT)).toBe(false);
    expect(caps.has(Capability.CARRIER_ASSIGN)).toBe(false);
  });

  test("an employee sees only their own parcels", () => {
    const caps = capabilitiesFor([RoleCode.EMPLOYEE]);
    expect(caps.has(Capability.PARCEL_VIEW_OWN)).toBe(true);
    expect(caps.has(Capability.PARCEL_VIEW_BRANCH)).toBe(false);
    expect(caps.has(Capability.PARCEL_VIEW_ALL)).toBe(false);
  });

  test("roles combine", () => {
    const caps = capabilitiesFor([RoleCode.EMPLOYEE, RoleCode.COURIER_RUNNER]);
    expect(caps.has(Capability.PARCEL_CREATE)).toBe(true);
    expect(caps.has(Capability.COURIER_ACTIONS)).toBe(true);
  });

  test("super admin holds every capability", () => {
    expect(capabilitiesFor([RoleCode.SUPER_ADMIN]).size).toBe(Object.values(Capability).length);
  });
});

describe("classification redaction", () => {
  test("parties always see the full record", () => {
    expect(contentAccess(ViewerRelation.PARTY, Classification.HIGHLY_CONFIDENTIAL)).toBe("FULL");
  });

  test("carriers see only the title of confidential parcels", () => {
    expect(contentAccess(ViewerRelation.CARRIER, Classification.NORMAL)).toBe("FULL");
    expect(contentAccess(ViewerRelation.CARRIER, Classification.CONFIDENTIAL)).toBe("TITLE_ONLY");
    expect(contentAccess(ViewerRelation.CARRIER, Classification.HIGHLY_CONFIDENTIAL)).toBe("REDACTED");
  });

  test("head office cannot read highly confidential contents", () => {
    expect(contentAccess(ViewerRelation.HEAD_OFFICE, Classification.CONFIDENTIAL)).toBe("FULL");
    expect(contentAccess(ViewerRelation.HEAD_OFFICE, Classification.HIGHLY_CONFIDENTIAL)).toBe("REDACTED");
  });

  test("lock-screen copy hides highly confidential titles", () => {
    const subject = notificationSubject({
      classification: Classification.HIGHLY_CONFIDENTIAL,
      trackingNumber: "ABG-261020-HO-00428",
      title: "Board Acquisition Agreement",
    });
    expect(subject).not.toContain("Board");
  });

  test("phone masking keeps only the edges", () => {
    expect(maskPhone("01712345678")).toBe("017•••••678");
    expect(maskPhone(null)).toBeNull();
  });
});

describe("tracking numbers and QR payloads", () => {
  test("uses the Asia/Dhaka calendar day", () => {
    // 20:30 UTC on 19 Oct is 02:30 on 20 Oct in Dhaka.
    const date = new Date("2026-10-19T20:30:00Z");
    expect(formatTrackingNumber(date, "ho", 428)).toBe("ABG-261020-HO-00428");
  });

  test("recognises its own format", () => {
    expect(isTrackingNumber("ABG-261020-FAC-00137")).toBe(true);
    expect(isTrackingNumber("abg-261020-ho-00428")).toBe(true);
    expect(isTrackingNumber("ABG-2610-HO-1")).toBe(false);
  });

  test("extracts opaque tokens from QR URLs", () => {
    expect(extractQrToken("https://dispatch.abg.com.bd/q/AbCdEfGhIjKlMnOpQrStUv")).toBe("AbCdEfGhIjKlMnOpQrStUv");
    expect(extractQrToken("AbCdEfGhIjKlMnOpQrStUv")).toBe("AbCdEfGhIjKlMnOpQrStUv");
    expect(extractQrToken("not a token")).toBeNull();
  });
});
