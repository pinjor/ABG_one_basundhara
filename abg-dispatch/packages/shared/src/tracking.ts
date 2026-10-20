/**
 * Human tracking numbers: ABG-YYMMDD-BRANCH-SEQUENCE, e.g. ABG-261020-HO-00428.
 * The sequence restarts per branch per day (Asia/Dhaka calendar day). These are
 * for people to read and search; they are never used to authorize anything —
 * QR codes carry a separate opaque token.
 */
export const TRACKING_PATTERN = /^ABG-(\d{6})-([A-Z0-9]{2,6})-(\d{5})$/;

export function dhakaDateStamp(date: Date): string {
  // Asia/Dhaka is UTC+6 with no daylight saving.
  const shifted = new Date(date.getTime() + 6 * 60 * 60 * 1000);
  const yy = String(shifted.getUTCFullYear() % 100).padStart(2, "0");
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function formatTrackingNumber(date: Date, branchCode: string, sequence: number): string {
  return `ABG-${dhakaDateStamp(date)}-${branchCode.toUpperCase()}-${String(sequence).padStart(5, "0")}`;
}

export function isTrackingNumber(value: string): boolean {
  return TRACKING_PATTERN.test(value.trim().toUpperCase());
}

/** QR payloads look like `https://<host>/q/<token>`; bare tokens are accepted too. */
export function extractQrToken(scanned: string): string | null {
  const value = scanned.trim();
  const match = value.match(/\/q\/([A-Za-z0-9_-]{16,128})\/?$/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{16,128}$/.test(value)) return value;
  return null;
}

export function qrPayload(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/q/${token}`;
}
