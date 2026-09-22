import { Module } from "@nestjs/common";
import { SurfacesService } from "./surfaces.service";
import { SurfacesController } from "./surfaces.controller";
import { EquipmentController } from "./equipment.controller";

@Module({
  providers: [SurfacesService],
  controllers: [SurfacesController, EquipmentController],
  exports: [SurfacesService],
})
export class SurfacesModule {}
