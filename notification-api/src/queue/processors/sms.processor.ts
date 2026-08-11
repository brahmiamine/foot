import { Injectable, Logger } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { NotificationChannelType } from '../../common/enums/channel.enum';
import { QUEUE_NAMES } from '../queue.constants';
import { BaseChannelProcessor } from './base-channel.processor';

/** Hors périmètre V1 (§36) : le worker existe pour la symétrie d'architecture, échouera tant qu'aucun SmsProvider réel n'est branché. */
@Injectable()
@Processor(QUEUE_NAMES.SMS)
export class SmsProcessor extends BaseChannelProcessor {
  protected readonly channelType = NotificationChannelType.SMS;
  protected readonly logger = new Logger(SmsProcessor.name);
}
