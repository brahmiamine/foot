import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  InitPaymeePaymentDto,
  PaymeeIntegrationMode,
} from './init-paymee-payment.dto';

describe('InitPaymeePaymentDto', () => {
  const validPayload = {
    orderId: 'ORDER-1',
    amount: 220.25,
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@paymee.tn',
    phoneNumber: '+21611222333',
  };

  it('accepts a complete payload and defaults mode to redirect', async () => {
    const dto = plainToInstance(InitPaymeePaymentDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.mode).toBe(PaymeeIntegrationMode.REDIRECT);
  });

  it('accepts an explicit iframe mode', async () => {
    const dto = plainToInstance(InitPaymeePaymentDto, {
      ...validPayload,
      mode: PaymeeIntegrationMode.IFRAME,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.mode).toBe(PaymeeIntegrationMode.IFRAME);
  });

  it.each([
    'orderId',
    'amount',
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
  ])('rejects a payload missing the mandatory field %s', async (field) => {
    const incomplete: Record<string, unknown> = { ...validPayload };
    delete incomplete[field];

    const dto = plainToInstance(InitPaymeePaymentDto, incomplete);
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === field)).toBe(true);
  });

  it('rejects an invalid mode value', async () => {
    const dto = plainToInstance(InitPaymeePaymentDto, {
      ...validPayload,
      mode: 'not-a-real-mode',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'mode')).toBe(true);
  });
});
