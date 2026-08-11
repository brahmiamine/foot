import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FlouciWebhookDto } from './flouci-webhook.dto';

describe('FlouciWebhookDto', () => {
  it('accepts a payload containing only payment_id', async () => {
    const dto = plainToInstance(FlouciWebhookDto, {
      payment_id: 'FoPKKHqfQIKfBqhEj8M47A',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts optional fields (developer_tracking_id, status, amount) when present', async () => {
    const dto = plainToInstance(FlouciWebhookDto, {
      payment_id: 'FoPKKHqfQIKfBqhEj8M47A',
      developer_tracking_id: 'payment-123',
      status: 'SUCCESS',
      amount: 25500,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a payload missing payment_id', async () => {
    const dto = plainToInstance(FlouciWebhookDto, {
      developer_tracking_id: 'payment-123',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'payment_id')).toBe(true);
  });
});
