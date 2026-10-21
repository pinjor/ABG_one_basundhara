import { Controller } from "@nestjs/common";
import { VisitorsService } from "./visitors.service";

/** Visitor pre-registration, gate passes and check-in/out. */
@Controller()
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}
}
