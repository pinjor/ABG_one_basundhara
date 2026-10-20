import { Injectable } from "@nestjs/common";
import { dhakaDateStamp, formatTrackingNumber } from "@abg-dispatch/shared";
import type { Tx } from "../common/prisma.service";

/** ABG-YYMMDD-BRANCH-SEQUENCE, with an atomic per-branch, per-Dhaka-day counter. */
@Injectable()
export class TrackingNumberService {
  async next(tx: Tx, branchCode: string, now = new Date()): Promise<string> {
    const day = dhakaDateStamp(now);
    const rows = await tx.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO "tracking_sequences" ("branchCode", "dayStamp", "lastValue")
      VALUES (${branchCode}, ${day}, 1)
      ON CONFLICT ("branchCode", "dayStamp")
      DO UPDATE SET "lastValue" = "tracking_sequences"."lastValue" + 1
      RETURNING "lastValue"`;
    return formatTrackingNumber(now, branchCode, Number(rows[0].lastValue));
  }
}
