import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaymeeWebhookDto } from './paymee-webhook.dto';

describe('PaymeeWebhookDto', () => {
  const validPayload = {
    token: 'dfe54df34b54df3a854f3a53fc85a',
    check_sum: 'checksum-value',
    payment_status: true,
    order_id: '244557',
    amount: 220.25,
  };

  it('accepts a complete, valid successful-payment payload', async () => {
    const dto = plainToInstance(PaymeeWebhookDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a complete, valid failed-payment payload', async () => {
    const dto = plainToInstance(PaymeeWebhookDto, {
      ...validPayload,
      payment_status: false,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts optional fields (received_amount, cost, transaction_id) when present', async () => {
    const dto = plainToInstance(PaymeeWebhookDto, {
      ...validPayload,
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@paymee.tn',
      phone: '+21611222333',
      note: 'Order #123',
      transaction_id: 5578,
      received_amount: 210.25,
      cost: 10,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it.each(['token', 'check_sum', 'payment_status', 'order_id', 'amount'])(
    'rejects an incomplete payload missing %s',
    async (field) => {
      const incomplete: Record<string, unknown> = { ...validPayload };
      delete incomplete[field];

      const dto = plainToInstance(PaymeeWebhookDto, incomplete);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((error) => error.property === field)).toBe(true);
    },
  );
});
