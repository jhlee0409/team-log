import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { LoggerService } from "../common/logger/logger.service";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private logger = new LoggerService(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Connected to PostgreSQL database", PrismaService.name);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
