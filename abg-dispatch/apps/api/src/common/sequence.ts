import type { Tx } from "./prisma.service";

/**
 * The next number in a named counter, atomically (row-locked upsert on
 * tracking_sequences). `key` names the counter, e.g. "TR" or "PC:HO", and
 * `period` the span it restarts in, e.g. a Dhaka day stamp "261021" or a year
 * "2026". Parcels, incidents and every module's reference numbers share it.
 */
export async function nextSequence(tx: Tx, key: string, period: string): Promise<number> {
  const rows = await tx.$queryRaw<{ lastValue: number }[]>`
    INSERT INTO "tracking_sequences" ("branchCode", "dayStamp", "lastValue")
    VALUES (${key}, ${period}, 1)
    ON CONFLICT ("branchCode", "dayStamp")
    DO UPDATE SET "lastValue" = "tracking_sequences"."lastValue" + 1
    RETURNING "lastValue"`;
  return Number(rows[0].lastValue);
}

/** The calendar year in Asia/Dhaka. */
export function dhakaYear(date: Date = new Date()): number {
  return new Date(date.getTime() + 6 * 3_600_000).getUTCFullYear();
}
