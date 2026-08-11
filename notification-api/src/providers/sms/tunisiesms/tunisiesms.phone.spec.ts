import {
  InvalidPhoneNumberError,
  maskPhoneNumber,
  normalizePhoneNumber,
} from './tunisiesms.phone';

describe('normalizePhoneNumber', () => {
  it('keeps an already-normalized Tunisian number unchanged', () => {
    expect(normalizePhoneNumber('+21612345678')).toBe('+21612345678');
  });

  it('normalizes a Tunisian number written with spaces/dashes', () => {
    expect(normalizePhoneNumber('+216 12-345 678')).toBe('+21612345678');
  });

  it('normalizes a Tunisian number without the leading "+"', () => {
    expect(normalizePhoneNumber('21612345678')).toBe('+21612345678');
  });

  it('normalizes a local 8-digit Tunisian number', () => {
    expect(normalizePhoneNumber('12345678')).toBe('+21612345678');
  });

  it('converts a "00" international prefix to "+"', () => {
    expect(normalizePhoneNumber('0021612345678')).toBe('+21612345678');
  });

  it('leaves an already-international non-Tunisian number untouched', () => {
    expect(normalizePhoneNumber('+33612345678')).toBe('+33612345678');
  });

  it('rejects an empty number', () => {
    expect(() => normalizePhoneNumber('')).toThrow(InvalidPhoneNumberError);
  });

  it('rejects an unrecognizable number rather than guessing a country code', () => {
    expect(() => normalizePhoneNumber('12345')).toThrow(
      InvalidPhoneNumberError,
    );
    expect(() => normalizePhoneNumber('not-a-number')).toThrow(
      InvalidPhoneNumberError,
    );
  });
});

describe('maskPhoneNumber', () => {
  it('masks the middle digits, keeping the prefix and last 3 digits', () => {
    expect(maskPhoneNumber('+21612345678')).toBe('+216*****678');
  });

  it('fully masks very short values', () => {
    expect(maskPhoneNumber('12345')).toBe('***');
  });
});
