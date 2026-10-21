import { Controller } from "@nestjs/common";
import { NoticesService } from "./notices.service";

/** The official notice board. */
@Controller()
export class NoticesController {
  constructor(private readonly service: NoticesService) {}
}
