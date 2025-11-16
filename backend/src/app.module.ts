import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { WorkspaceModule } from "./workspace/workspace.module";
import { LogModule } from "./log/log.module";
import { YjsModule } from "./yjs/yjs.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UserModule,
    WorkspaceModule,
    LogModule,
    YjsModule,
  ],
})
export class AppModule {}
