import { describe, expect, test } from "bun:test";
import {
  LicenceAlertLevel,
  addCalendarDays,
  canMoveRenewal,
  daysUntil,
  dhakaToday,
  isCalendarDate,
  isLicenceAlertDue,
  isRenewalInProgress,
  isRenewalMoveBack,
  licenceAlertLevel,
  licenceAlertThreshold,
  licenceCountdownLabel,
  licenceCountdownTone,
  licenceState,
  nextLicenceAlertDays,
  renewalProgress,
} from "./licences";

describe("licence countdowns", () => {
  test("count whole Asia/Dhaka calendar days", () => {
    // 20:30 UTC on 20 Oct is 02:30 on 21 Oct in Dhaka.
    const lateNight = new Date("2026-10-20T20:30:00Z");
    expect(dhakaToday(lateNight)).toBe("2026-10-21");
    expect(daysUntil("2026-10-21", lateNight)).toBe(0);
    expect(daysUntil("2026-11-02", lateNight)).toBe(12);
    expect(daysUntil(new Date("2026-10-16T00:00:00Z"), lateNight)).toBe(-5);
    // 17:59 UTC is still 20 Oct in Dhaka.
    expect(daysUntil("2026-10-21", new Date("2026-10-20T17:59:00Z"))).toBe(1);
  });

  test("states follow the expiry date and the renewal window", () => {
    const now = new Date("2026-10-21T06:00:00Z");
    expect(licenceState("2026-10-20", 90, now)).toBe("EXPIRED");
    expect(licenceState("2026-10-21", 90, now)).toBe("EXPIRING");
    expect(licenceState("2026-11-20", 90, now)).toBe("EXPIRING");
    expect(licenceState("2026-11-21", 90, now)).toBe("DUE_SOON");
    expect(licenceState("2027-01-19", 90, now)).toBe("DUE_SOON");
    expect(licenceState("2027-01-20", 90, now)).toBe("VALID");
    // A short window never hides the last 30 days.
    expect(licenceState("2026-11-10", 14, now)).toBe("EXPIRING");
    expect(licenceState("2026-12-10", 14, now)).toBe("VALID");
  });

  test("badge text and tone", () => {
    expect(licenceCountdownLabel(12)).toBe("12 days left");
    expect(licenceCountdownLabel(1)).toBe("1 day left");
    expect(licenceCountdownLabel(0)).toBe("Expires today");
    expect(licenceCountdownLabel(-1)).toBe("Expired 1 day ago");
    expect(licenceCountdownLabel(-5)).toBe("Expired 5 days ago");
    expect(licenceCountdownTone(-5)).toBe("danger");
    expect(licenceCountdownTone(20)).toBe("danger");
    expect(licenceCountdownTone(45)).toBe("pending");
    expect(licenceCountdownTone(200)).toBe("success");
  });

  test("calendar dates are validated and added", () => {
    expect(isCalendarDate("2026-02-28")).toBe(true);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("26-02-01")).toBe(false);
    expect(addCalendarDays("2026-12-25", 10)).toBe("2027-01-04");
  });
});

describe("renewals", () => {
  test("progress runs from 0 to 100 across the stages", () => {
    expect(renewalProgress("NOT_STARTED")).toBe(0);
    expect(renewalProgress("APPLICATION_SUBMITTED")).toBe(40);
    expect(renewalProgress("FEE_PAID")).toBe(80);
    expect(renewalProgress("RENEWED")).toBe(100);
    expect(isRenewalInProgress("INSPECTION_SCHEDULED")).toBe(true);
    expect(isRenewalInProgress("NOT_STARTED")).toBe(false);
  });

  test("stages move forward (skipping is allowed) or back; Renewed needs a new expiry date", () => {
    expect(canMoveRenewal("NOT_STARTED", "APPLICATION_SUBMITTED")).toBe(true);
    expect(canMoveRenewal("FEE_PAID", "DOCUMENTS_PREPARED")).toBe(true);
    expect(isRenewalMoveBack("FEE_PAID", "DOCUMENTS_PREPARED")).toBe(true);
    expect(canMoveRenewal("FEE_PAID", "RENEWED")).toBe(false);
    expect(canMoveRenewal("FEE_PAID", "FEE_PAID")).toBe(false);
    expect(canMoveRenewal("FEE_PAID", "SOMEWHERE")).toBe(false);
  });
});

describe("expiry alerts", () => {
  test("each threshold is reached once, nearest first", () => {
    expect(licenceAlertThreshold(120)).toBeNull();
    expect(licenceAlertThreshold(90)).toBe(90);
    expect(licenceAlertThreshold(45)).toBe(60);
    expect(licenceAlertThreshold(12)).toBe(15);
    expect(licenceAlertThreshold(7)).toBe(7);
    expect(licenceAlertThreshold(0)).toBe(0);
    expect(licenceAlertThreshold(-30)).toBe(0);
  });

  test("early warnings wait for the renewal window; the last 30 days always alert", () => {
    expect(licenceAlertThreshold(75, 60)).toBeNull();
    expect(licenceAlertThreshold(55, 60)).toBe(60);
    expect(licenceAlertThreshold(40, 14)).toBeNull();
    expect(licenceAlertThreshold(25, 14)).toBe(30);
  });

  test("an alert is due only for a threshold nearer expiry than the last one sent", () => {
    expect(isLicenceAlertDue(12, 90, null)).toBe(true);
    expect(isLicenceAlertDue(12, 90, 30)).toBe(true);
    expect(isLicenceAlertDue(12, 90, 15)).toBe(false);
    expect(isLicenceAlertDue(-3, 90, 0)).toBe(false);
    expect(nextLicenceAlertDays(12, 90, 15)).toBe(7);
    expect(nextLicenceAlertDays(-3, 90, 0)).toBeNull();
    expect(nextLicenceAlertDays(200, 90, null)).toBe(90);
  });

  test("who is told widens as expiry nears", () => {
    expect(licenceAlertLevel(90)).toBe(LicenceAlertLevel.OWNER);
    expect(licenceAlertLevel(60)).toBe(LicenceAlertLevel.OWNER);
    expect(licenceAlertLevel(30)).toBe(LicenceAlertLevel.OFFICE);
    expect(licenceAlertLevel(15)).toBe(LicenceAlertLevel.OFFICE);
    expect(licenceAlertLevel(7)).toBe(LicenceAlertLevel.LEADERSHIP);
    expect(licenceAlertLevel(0)).toBe(LicenceAlertLevel.LEADERSHIP);
  });
});
