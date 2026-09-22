import { PartialType } from "@nestjs/mapped-types";
import { CreateSurfaceDto } from "./create-surface.dto";

export class UpdateSurfaceDto extends PartialType(CreateSurfaceDto) {}
