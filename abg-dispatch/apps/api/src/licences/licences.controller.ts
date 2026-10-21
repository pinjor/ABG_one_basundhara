import { Controller } from "@nestjs/common";
import { LicencesService } from "./licences.service";

/** The regulatory licence register. */
@Controller()
export class LicencesController {
  constructor(private readonly service: LicencesService) {}
}
