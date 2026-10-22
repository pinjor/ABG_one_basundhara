import { describe, expect, test } from "bun:test";
import {
  TOUR_TRANSITIONS,
  TourStatus,
  canTourTransition,
  formatTaka,
  formatTakaShort,
  formatTourNumber,
  passportNeedsRenewal,
  tourAwaiting,
  tourDurationDays,
  tourPipeline,
} from "./index";

describe("official tours", () => {
  test("overseas tours need the MD / Chairman's sanction; local tours do not", () => {
    expect(tourPipeline("FOREIGN")).toContain(TourStatus.PENDING_SANCTION);
    expect(tourPipeline("LOCAL")).not.toContain(TourStatus.PENDING_SANCTION);
    expect(canTourTransition("PENDING_VETTING", "PENDING_SANCTION")).toBe(true);
    expect(canTourTransition("PENDING_HOD", "APPROVED")).toBe(false);
    expect(canTourTransition("ACTIVE", "CANCELLED")).toBe(false);
    for (const end of ["COMPLETED", "REJECTED", "CANCELLED"] as const) expect(TOUR_TRANSITIONS[end]).toHaveLength(0);
  });

  test("each pending status names whose decision it waits for", () => {
    expect(tourAwaiting("PENDING_HOD")).toBe("HOD");
    expect(tourAwaiting("PENDING_VETTING")).toBe("VETTING");
    expect(tourAwaiting("PENDING_SANCTION")).toBe("SANCTION");
    expect(tourAwaiting("APPROVED")).toBeNull();
  });

  test("reference numbers are per year and zero-padded", () => {
    expect(formatTourNumber(2026, 88)).toBe("ABG-TR-2026-088");
    expect(formatTourNumber(2027, 1204)).toBe("ABG-TR-2027-1204");
  });

  test("a passport must stay valid six months after the return date", () => {
    expect(passportNeedsRenewal("2027-03-01", "2026-11-20")).toBe(true);
    expect(passportNeedsRenewal("2027-05-21", "2026-11-20")).toBe(false);
    expect(passportNeedsRenewal(null, "2026-11-20")).toBe(false);
  });

  test("Taka uses lakh / crore grouping", () => {
    expect(formatTaka(6_500_000)).toBe("৳ 65,00,000");
    expect(formatTaka(485_000)).toBe("৳ 4,85,000");
    expect(formatTaka(950)).toBe("৳ 950");
    expect(formatTaka(null)).toBe("—");
    expect(formatTakaShort(485_000)).toBe("৳ 4.85 L");
    expect(formatTakaShort(6_500_000)).toBe("৳ 65 L");
    expect(formatTakaShort(100_000_000)).toBe("৳ 10 Cr");
    expect(formatTakaShort(12_500_000)).toBe("৳ 1.25 Cr");
  });

  test("duration counts the first and the last day", () => {
    expect(tourDurationDays("2026-11-14", "2026-11-18")).toBe(5);
    expect(tourDurationDays("2026-11-14", "2026-11-14")).toBe(1);
  });
});
