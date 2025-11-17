import { Module, forwardRef } from "@nestjs/common";
import { LogService } from "./log.service";
import { LogController } from "./log.controller";
import { ArchiveScheduler } from "./archive.scheduler";
import { WorkspaceMemberGuard } from "../auth/guards/workspace-member.guard";
import { YjsModule } from "../yjs/yjs.module";

@Module({
  imports: [forwardRef(() => YjsModule)],
  controllers: [LogController],
  providers: [LogService, ArchiveScheduler, WorkspaceMemberGuard],
  exports: [LogService],
})
export class LogModule {}
