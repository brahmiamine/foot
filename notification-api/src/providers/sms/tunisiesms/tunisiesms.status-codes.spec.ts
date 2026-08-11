import {
  describeTunisieSmsStatusCode,
  isTunisieSmsSuccessStatusCode,
} from './tunisiesms.status-codes';

describe('TunisieSMS status codes', () => {
  it('treats 200 as the only success status code', () => {
    expect(isTunisieSmsSuccessStatusCode(200)).toBe(true);
    expect(isTunisieSmsSuccessStatusCode(400)).toBe(false);
  });

  it.each([
    [400, 'MISSING_ID'],
    [401, 'UNAUTHORIZED_ID'],
    [402, 'INSUFFICIENT_CREDIT'],
    [420, 'DAILY_QUOTA_EXCEEDED'],
    [430, 'MESSAGE_REQUIRED'],
    [431, 'DESTINATION_REQUIRED'],
    [440, 'MESSAGE_TOO_LONG'],
    [441, 'DESTINATION_NOT_ALLOWED'],
    [442, 'SENDER_NOT_ALLOWED'],
  ])('maps status code %i to %s', (code, expectedErrorCode) => {
    expect(describeTunisieSmsStatusCode(code).errorCode).toBe(
      expectedErrorCode,
    );
  });

  it('maps 200 to OK', () => {
    expect(describeTunisieSmsStatusCode(200).errorCode).toBe('OK');
  });

  it('never treats an undocumented code as a known success/error and does not throw', () => {
    const info = describeTunisieSmsStatusCode(999);

    expect(info.errorCode).toBe('UNKNOWN_ERROR');
    expect(info.message).toContain('999');
  });
});
