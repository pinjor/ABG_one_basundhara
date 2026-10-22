import { describe, expect, test } from "bun:test";
import {
  Capability,
  NoticeChannel,
  RoleCode,
  capabilitiesFor,
  formatNoticeNumber,
  isNoticeNumber,
  noticeChannelIsOfficeOnly,
  noticeChannelsFor,
  noticeExcerpt,
  noticeParagraphs,
  noticePercent,
} from "./index";

describe("notice board vocabulary", () => {
  test("reference numbers are ABG-NB-YYYY-NNN", () => {
    expect(formatNoticeNumber(2026, 14)).toBe("ABG-NB-2026-014");
    expect(formatNoticeNumber(2026, 1204)).toBe("ABG-NB-2026-1204");
    expect(isNoticeNumber("ABG-NB-2026-014")).toBe(true);
    expect(isNoticeNumber("INC-261020-HO-001")).toBe(false);
  });

  test("only the executive role speaks for the Chairman and the Managing Director", () => {
    expect(noticeChannelsFor([RoleCode.EXECUTIVE, RoleCode.EMPLOYEE])).toEqual([NoticeChannel.CHAIRMAN, NoticeChannel.MANAGING_DIRECTOR]);
    expect(noticeChannelsFor([RoleCode.HR_FINANCE])).toEqual([NoticeChannel.HR]);
    expect(noticeChannelsFor([RoleCode.COMPLIANCE_OFFICER])).toEqual([NoticeChannel.COMPLIANCE]);
    expect(noticeChannelsFor([RoleCode.BRANCH_ADMIN])).toEqual([NoticeChannel.ADMINISTRATION]);
    expect(noticeChannelsFor([RoleCode.HEAD_OFFICE_ADMIN])).toEqual([NoticeChannel.HR, NoticeChannel.ADMINISTRATION, NoticeChannel.COMPLIANCE, NoticeChannel.IT]);
    expect(noticeChannelsFor([RoleCode.SUPER_ADMIN])).toHaveLength(6);
    expect(noticeChannelsFor([RoleCode.EMPLOYEE])).toEqual([]);
  });

  test("every role that may publish has at least one channel", () => {
    for (const role of Object.values(RoleCode)) {
      if (capabilitiesFor([role]).has(Capability.NOTICE_PUBLISH)) expect(noticeChannelsFor([role]).length).toBeGreaterThan(0);
    }
  });

  test("branch admins reach only their own offices; head office reaches everyone", () => {
    expect(noticeChannelIsOfficeOnly([RoleCode.BRANCH_ADMIN, RoleCode.EMPLOYEE], NoticeChannel.ADMINISTRATION)).toBe(true);
    expect(noticeChannelIsOfficeOnly([RoleCode.HEAD_OFFICE_ADMIN], NoticeChannel.ADMINISTRATION)).toBe(false);
    expect(noticeChannelIsOfficeOnly([RoleCode.BRANCH_ADMIN, RoleCode.HEAD_OFFICE_ADMIN], NoticeChannel.ADMINISTRATION)).toBe(false);
    expect(noticeChannelIsOfficeOnly([RoleCode.SUPER_ADMIN], NoticeChannel.ADMINISTRATION)).toBe(false);
  });

  test("excerpts cut at a word and stay within the limit", () => {
    const body = "All employees must obtain written sanction from the Managing Director or the Chairman before any foreign travel. ".repeat(4);
    const excerpt = noticeExcerpt(body);
    expect(excerpt.length).toBeLessThanOrEqual(180);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).not.toContain("  ");
    expect(noticeExcerpt("Short\n\nnotice.")).toBe("Short notice.");
  });

  test("paragraphs split on blank lines and percentages round", () => {
    expect(noticeParagraphs("First line\nstill first.\r\n\r\nSecond.\n\n\n")).toEqual(["First line\nstill first.", "Second."]);
    expect(noticePercent(184, 240)).toBe(77);
    expect(noticePercent(0, 0)).toBeNull();
    expect(noticePercent(5, 4)).toBe(100);
  });
});
