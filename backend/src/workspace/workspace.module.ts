import { Module } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";
import { WorkspaceController } from "./workspace.controller";
import { UserModule } from "../user/user.module";

@Module({
  imports: [UserModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
