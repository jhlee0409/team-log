import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "../prisma/prisma.module";
import { YjsModule } from "../yjs/yjs.module";

@Module({
  imports: [PrismaModule, YjsModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
