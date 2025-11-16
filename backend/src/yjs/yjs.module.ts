import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { YjsService } from "./yjs.service";
import { YjsGateway } from "./yjs.gateway";
import { LogModule } from "../log/log.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    LogModule,
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("JWT_SECRET"),
        signOptions: { expiresIn: config.get("JWT_EXPIRATION") || "7d" },
      }),
    }),
  ],
  providers: [YjsService, YjsGateway],
  exports: [YjsService],
})
export class YjsModule {}
