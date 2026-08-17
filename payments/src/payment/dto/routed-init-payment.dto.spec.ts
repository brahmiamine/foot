import { validate } from 'class-validator';
import { RoutedInitPaymentDto } from './routed-init-payment.dto';

describe('RoutedInitPaymentDto', () => {
  it('requires the payer fields needed by every routable provider', async () => {
    const dto = new RoutedInitPaymentDto();
    Object.assign(dto, {
      orderId: 'ORDER-1',
      amount: 25.5,
      currency: 'TND',
    });

    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'phoneNumber']),
    );
  });

  it('accepts a complete provider-agnostic request', async () => {
    const dto = new RoutedInitPaymentDto();
    Object.assign(dto, {
      orderId: 'ORDER-1',
      amount: 25.5,
      currency: 'TND',
      firstName: 'Amin',
      lastName: 'Brahmi',
      email: 'amin@example.test',
      phoneNumber: '20000000',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
