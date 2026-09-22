import { PartialType } from "@nestjs/mapped-types";
import { CreateVipGuestDto } from "./create-vip-guest.dto";

export class UpdateVipGuestDto extends PartialType(CreateVipGuestDto) {}
