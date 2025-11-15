import { Injectable, Logger } from '@nestjs/common';
import { YjsService } from './yjs.service';

/**
 * Yjs Gateway - WebSocket gateway for real-time collaboration
 * The actual WebSocket server is handled by y-websocket library in YjsService
 * This class is here to provide additional hooks if needed
 */
@Injectable()
export class YjsGateway {
  private readonly logger = new Logger(YjsGateway.name);

  constructor(private yjsService: YjsService) {}

  // Additional WebSocket logic can be added here
}
