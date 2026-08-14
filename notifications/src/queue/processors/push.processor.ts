import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { QUEUE_NAMES } from '../queue.constants';
import { BaseChannelProcessor } from './base-channel.processor';

@Injectable()
@Processor(QUEUE_NAMES.PUSH)
export class PushProcessor extends BaseChannelProcessor {
  protected readonly channelType = NotificationChannelType.PUSH;
  protected readonly logger = new Logger(PushProcessor.name);
}
