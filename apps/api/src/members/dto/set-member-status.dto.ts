import { IsIn } from "class-validator";
import { MemberStatus } from "@bsc/shared";

export class SetMemberStatusDto {
  @IsIn(Object.values(MemberStatus))
  status!: string;
}
