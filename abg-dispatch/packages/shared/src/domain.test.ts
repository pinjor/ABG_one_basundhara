import { describe, expect, test } from "bun:test";
import {
  Capability,
  Classification,
  INCIDENT_CATEGORY_GROUP,
  INCIDENT_CATEGORY_HINT,
  INCIDENT_CATEGORY_LABEL,
  INCIDENT_CONFIDENTIAL_ROLES,
  INCIDENT_GROUP_CATEGORIES,
  INCIDENT_GROUPS,
  INCIDENT_SEVERITY_TONE,
  INCIDENT_STAGES,
  INCIDENT_TRANSITIONS,
  IncidentCategory,
  IncidentGroup,
  IncidentResolution,
  IncidentStatus,
  OPEN_INCIDENT_STATUSES,
  canIncidentTransition,
  formatIncidentNumber,
  incidentForcesConfidential,
  incidentGroupOf,
  incidentResolutionNeedsNote,
  isIncidentNumber,
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

describe("incident & facility issues", () => {
  test("four stages, forward only, skippable, and a closed report reopens into investigation", () => {
    expect(INCIDENT_STAGES).toEqual(["REPORTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "CLOSED"]);
    expect(canIncidentTransition("REPORTED", "ACKNOWLEDGED")).toBe(true);
    expect(canIncidentTransition("REPORTED", "UNDER_INVESTIGATION")).toBe(true);
    expect(canIncidentTransition("REPORTED", "CLOSED")).toBe(true);
    expect(canIncidentTransition("ACKNOWLEDGED", "UNDER_INVESTIGATION")).toBe(true);
    expect(canIncidentTransition("ACKNOWLEDGED", "CLOSED")).toBe(true);
    expect(canIncidentTransition("UNDER_INVESTIGATION", "CLOSED")).toBe(true);
    expect(canIncidentTransition("CLOSED", "UNDER_INVESTIGATION")).toBe(true);
    expect(canIncidentTransition("UNDER_INVESTIGATION", "ACKNOWLEDGED")).toBe(false);
    expect(canIncidentTransition("CLOSED", "ACKNOWLEDGED")).toBe(false);
    expect(canIncidentTransition("ACKNOWLEDGED", "ACKNOWLEDGED")).toBe(false);
    for (const from of Object.values(IncidentStatus)) expect(INCIDENT_TRANSITIONS[from]).not.toContain("REPORTED");
    expect(OPEN_INCIDENT_STATUSES).toEqual(["REPORTED", "ACKNOWLEDGED", "UNDER_INVESTIGATION"]);
  });

  test("every sub-category belongs to exactly one of the four groups, with a label and a hint", () => {
    expect(INCIDENT_GROUPS).toEqual([IncidentGroup.SAFETY_INDUSTRIAL, IncidentGroup.ADMIN_FACILITY, IncidentGroup.SECURITY, IncidentGroup.IT_TECHNICAL]);
    const listed = INCIDENT_GROUPS.flatMap((g) => INCIDENT_GROUP_CATEGORIES[g]);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(Object.values(IncidentCategory).sort());
    for (const c of Object.values(IncidentCategory)) {
      expect(INCIDENT_GROUP_CATEGORIES[INCIDENT_CATEGORY_GROUP[c]]).toContain(c);
      expect(INCIDENT_CATEGORY_LABEL[c]).toBeTruthy();
      expect(INCIDENT_CATEGORY_HINT[c]).toBeTruthy();
    }
    expect(incidentGroupOf("GAS_LEAK")).toBe("SAFETY_INDUSTRIAL");
    expect(incidentGroupOf("WATER_SUPPLY")).toBe("ADMIN_FACILITY");
    expect(incidentGroupOf("CCTV_FAULT")).toBe("SECURITY");
    expect(incidentGroupOf("NETWORK_DOWN")).toBe("IT_TECHNICAL");
    expect(incidentGroupOf("ELECTRICAL")).toBeNull();
  });

  test("severity tones: Critical red, High amber, Medium blue, Low grey", () => {
    expect(INCIDENT_SEVERITY_TONE).toEqual({ CRITICAL: "danger", HIGH: "pending", MEDIUM: "active", LOW: "neutral" });
  });

  test("closing needs a resolution; anything but Resolved needs a note", () => {
    expect(incidentResolutionNeedsNote(IncidentResolution.RESOLVED)).toBe(false);
    for (const r of [IncidentResolution.NO_ACTION_NEEDED, IncidentResolution.DUPLICATE, IncidentResolution.REFERRED]) expect(incidentResolutionNeedsNote(r)).toBe(true);
  });

  test("misconduct is always confidential, and confidential reports are for head office only", () => {
    expect(incidentForcesConfidential("MISCONDUCT")).toBe(true);
    expect(incidentForcesConfidential("THEFT_LOSS")).toBe(false);
    expect(INCIDENT_CONFIDENTIAL_ROLES).toContain(RoleCode.HEAD_OFFICE_ADMIN);
    expect(INCIDENT_CONFIDENTIAL_ROLES).toContain(RoleCode.EXECUTIVE);
    expect(INCIDENT_CONFIDENTIAL_ROLES).not.toContain(RoleCode.BRANCH_ADMIN);
    expect(INCIDENT_CONFIDENTIAL_ROLES).not.toContain(RoleCode.AUDITOR);
    expect(capabilitiesFor([RoleCode.EXECUTIVE]).has(Capability.INCIDENT_VIEW)).toBe(true);
  });

  test("reference numbers name the day and the office", () => {
    const ref = formatIncidentNumber("261020", "FCA", 7);
    expect(ref).toBe("INC-261020-FCA-007");
    expect(isIncidentNumber(ref)).toBe(true);
    expect(isIncidentNumber("ABG-261020-HO-00428")).toBe(false);
  });

  test("every employee role can report; only admins can manage", () => {
    for (const role of [RoleCode.EMPLOYEE, RoleCode.RECEIVER, RoleCode.COURIER_RUNNER, RoleCode.DISPATCH_OFFICER]) {
      expect(capabilitiesFor([role]).has(Capability.INCIDENT_REPORT)).toBe(true);
      expect(capabilitiesFor([role]).has(Capability.INCIDENT_MANAGE)).toBe(false);
    }
    expect(capabilitiesFor([RoleCode.BRANCH_ADMIN]).has(Capability.INCIDENT_MANAGE)).toBe(true);
    expect(capabilitiesFor([RoleCode.AUDITOR]).has(Capability.INCIDENT_VIEW)).toBe(true);
    expect(capabilitiesFor([RoleCode.AUDITOR]).has(Capability.INCIDENT_MANAGE)).toBe(false);
  });
});
