import { IsIn } from "class-validator";
import { FacilityStatus } from "@bsc/shared";

export class SetFacilityStatusDto {
  @IsIn(Object.values(FacilityStatus))
  status!: string;
}
