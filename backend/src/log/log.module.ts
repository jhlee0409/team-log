import { Module } from '@nestjs/common';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { ArchiveScheduler } from './archive.scheduler';

@Module({
  controllers: [LogController],
  providers: [LogService, ArchiveScheduler],
  exports: [LogService],
})
export class LogModule {}
