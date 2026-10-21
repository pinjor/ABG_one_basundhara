import { Controller } from "@nestjs/common";
import { ToursService } from "./tours.service";

/** Official tour requests. */
@Controller()
export class ToursController {
  constructor(private readonly service: ToursService) {}
}
