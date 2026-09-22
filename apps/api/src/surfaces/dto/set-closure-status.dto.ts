import { IsIn } from "class-validator";
import { ClosureStatus } from "@bsc/shared";

export class SetClosureStatusDto {
  @IsIn(Object.values(ClosureStatus))
  closureStatus!: string;
}
