import { InvalidPhoneNumberError } from './tunisiesms.phone';
import {
  buildTunisieSmsPayload,
  mapTunisieSmsResponse,
} from './tunisiesms.mapper';

describe('buildTunisieSmsPayload', () => {
  it('maps to/message/sender onto destination/content/sender', () => {
    const payload = buildTunisieSmsPayload({
      to: '+21612345678',
      body: 'Votre commande est confirmee',
      sender: 'FootClub',
    });

    expect(payload).toEqual({
      destination: '+21612345678',
      content: 'Votre commande est confirmee',
      sender: 'FootClub',
    });
  });

  it('normalizes the destination phone number', () => {
    const payload = buildTunisieSmsPayload({
      to: '12345678',
      body: 'Rappel match',
    });

    expect(payload.destination).toBe('+21612345678');
  });

  it('falls back to the configured default sender when none is provided on the request', () => {
    const payload = buildTunisieSmsPayload(
      { to: '+21612345678', body: 'Rappel match' },
      'FootClub',
    );

    expect(payload.sender).toBe('FootClub');
  });

  it('prefers the per-request sender over the default one', () => {
    const payload = buildTunisieSmsPayload(
      { to: '+21612345678', body: 'Rappel match', sender: 'OB' },
      'FootClub',
    );

    expect(payload.sender).toBe('OB');
  });

  it('omits sender entirely when neither is provided', () => {
    const payload = buildTunisieSmsPayload({
      to: '+21612345678',
      body: 'Rappel match',
    });

    expect(payload.sender).toBeUndefined();
  });

  it('never leaks account credentials: the payload only ever contains business fields', () => {
    const payload = buildTunisieSmsPayload({ to: '+21612345678', body: 'msg' });

    expect(Object.keys(payload).sort()).toEqual(['content', 'destination']);
  });

  it('propagates phone normalization failures', () => {
    expect(() =>
      buildTunisieSmsPayload({ to: 'not-a-number', body: 'msg' }),
    ).toThrow(InvalidPhoneNumberError);
  });
});

describe('mapTunisieSmsResponse', () => {
  it('maps status_code 200 to a success result, keeping the message_id', () => {
    const result = mapTunisieSmsResponse({
      statusCode: 200,
      statusMsg: 'ok',
      messageId: 'XYZ-1',
    });

    expect(result).toEqual({
      success: true,
      providerMessageId: 'XYZ-1',
      providerStatus: 'ok',
    });
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
  ])(
    'maps status_code %i to a failed result with errorCode %s',
    (statusCode, errorCode) => {
      const result = mapTunisieSmsResponse({ statusCode });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(errorCode);
      expect(result.errorMessage).toBeTruthy();
    },
  );

  it('never returns success for a non-200 status code, even with a message_id present', () => {
    const result = mapTunisieSmsResponse({
      statusCode: 402,
      messageId: 'XYZ-1',
    });

    expect(result.success).toBe(false);
  });
});
