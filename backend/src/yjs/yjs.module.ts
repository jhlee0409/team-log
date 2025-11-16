import { Module } from "@nestjs/common";
import { YjsService } from "./yjs.service";
import { YjsGateway } from "./yjs.gateway";
import { LogModule } from "../log/log.module";

@Module({
  imports: [LogModule],
  providers: [YjsService, YjsGateway],
  exports: [YjsService],
})
export class YjsModule {}
