import { IsIn } from "class-validator";
import { ServiceRequestStatus } from "@bsc/shared";

export class SetServiceRequestStatusDto {
  @IsIn(Object.values(ServiceRequestStatus))
  status!: string;
}
