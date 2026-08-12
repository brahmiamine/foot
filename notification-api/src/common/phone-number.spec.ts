import { isValidE164, normalizeTunisianPhoneNumber } from './phone-number';

describe('normalizeTunisianPhoneNumber (TS-45)', () => {
  it('normalizes a bare 8-digit local number', () => {
    expect(normalizeTunisianPhoneNumber('20123456')).toBe('+21620123456');
  });

  it('normalizes a leading-zero local number (0XX XXX XXX)', () => {
    expect(normalizeTunisianPhoneNumber('020 123 456')).toBe('+21620123456');
  });

  it('normalizes an already-international number with a + prefix', () => {
    expect(normalizeTunisianPhoneNumber('+216 20 123 456')).toBe(
      '+21620123456',
    );
  });

  it('normalizes an international number without the + prefix', () => {
    expect(normalizeTunisianPhoneNumber('21620123456')).toBe('+21620123456');
  });

  it('strips separators (spaces, dashes, dots)', () => {
    expect(normalizeTunisianPhoneNumber('20-123.456')).toBe('+21620123456');
  });

  it('returns null for null/undefined/empty input', () => {
    expect(normalizeTunisianPhoneNumber(null)).toBeNull();
    expect(normalizeTunisianPhoneNumber(undefined)).toBeNull();
    expect(normalizeTunisianPhoneNumber('')).toBeNull();
  });

  it('returns null for a number with the wrong number of digits', () => {
    expect(normalizeTunisianPhoneNumber('2012345')).toBeNull();
    expect(normalizeTunisianPhoneNumber('201234567')).toBeNull();
  });

  it('returns null for a non-Tunisian international number', () => {
    expect(normalizeTunisianPhoneNumber('+33612345678')).toBeNull();
  });
});

describe('isValidE164', () => {
  it('accepts a valid E.164 Tunisian number', () => {
    expect(isValidE164('+21620123456')).toBe(true);
  });

  it('rejects a number without the + prefix', () => {
    expect(isValidE164('21620123456')).toBe(false);
  });

  it('rejects a number starting with +0', () => {
    expect(isValidE164('+0123456789')).toBe(false);
  });

  it('rejects a number that is too short', () => {
    expect(isValidE164('+1234567')).toBe(false);
  });
});
