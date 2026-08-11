import { analyzeSmsContent } from './tunisiesms.encoding';

describe('analyzeSmsContent', () => {
  it('detects a short latin message as GSM 7-bit, single segment', () => {
    const analysis = analyzeSmsContent(
      'Votre paiement de 50 TND a ete confirme. Merci !',
    );

    expect(analysis.encoding).toBe('GSM_7BIT');
    expect(analysis.singleSegmentLimit).toBe(160);
    expect(analysis.segments).toBe(1);
  });

  it('detects Arabic text as Unicode', () => {
    const analysis = analyzeSmsContent('تم تأكيد الدفع بنجاح');

    expect(analysis.encoding).toBe('UNICODE');
    expect(analysis.singleSegmentLimit).toBe(70);
  });

  it('detects an emoji as Unicode', () => {
    const analysis = analyzeSmsContent('Votre commande est en route 🚚');

    expect(analysis.encoding).toBe('UNICODE');
  });

  it('computes multiple segments for a long latin message', () => {
    const longMessage = 'a'.repeat(200);

    const analysis = analyzeSmsContent(longMessage);

    expect(analysis.encoding).toBe('GSM_7BIT');
    expect(analysis.length).toBe(200);
    expect(analysis.segments).toBe(Math.ceil(200 / 153));
  });

  it('computes multiple segments for a long unicode message', () => {
    const longMessage = 'أ'.repeat(140);

    const analysis = analyzeSmsContent(longMessage);

    expect(analysis.encoding).toBe('UNICODE');
    expect(analysis.segments).toBe(Math.ceil(140 / 67));
  });

  it('never truncates: length always reflects the full message', () => {
    const message = 'x'.repeat(500);

    expect(analyzeSmsContent(message).length).toBe(500);
  });

  it('detects a special character outside the GSM set (em dash) as Unicode', () => {
    const analysis = analyzeSmsContent('Réservation confirmée — à bientôt');

    expect(analysis.encoding).toBe('UNICODE');
  });
});
