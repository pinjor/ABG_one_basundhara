import { Controller } from "@nestjs/common";
import { FleetService } from "./fleet.service";

/** Pool car requisitions and the fleet register. */
@Controller()
export class FleetController {
  constructor(private readonly service: FleetService) {}
}
