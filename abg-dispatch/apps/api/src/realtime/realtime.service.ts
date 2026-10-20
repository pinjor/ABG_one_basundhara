import { Global, Injectable, Module } from "@nestjs/common";
import { Subject } from "rxjs";

export interface ParcelChange {
  parcelId: string;
  trackingNumber: string;
  status: string;
  eventTypes: string[];
  originBranchId: string;
  destinationBranchId: string | null;
  at: string;
}

/** In-process fan-out for the admin live feed (Server-Sent Events). */
@Injectable()
export class RealtimeService {
  readonly changes = new Subject<ParcelChange>();

  publish(change: ParcelChange) {
    this.changes.next(change);
  }
}

@Global()
@Module({ providers: [RealtimeService], exports: [RealtimeService] })
export class RealtimeModule {}
