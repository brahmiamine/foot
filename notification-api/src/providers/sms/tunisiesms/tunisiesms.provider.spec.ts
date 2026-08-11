import { Logger } from '@nestjs/common';
import { TunisieSmsTransportError } from './tunisiesms.exceptions';
import { TunisieSmsProvider } from './tunisiesms.provider';

function makeConfig(sender?: string) {
  return { get: jest.fn(() => sender) };
}

describe('TunisieSmsProvider', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns a success result with the provider message_id on a successful send', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({
        statusCode: 200,
        statusMsg: 'ok',
        messageId: 'XYZ-1',
      }),
    };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig() as never,
    );

    const result = await provider.send({
      to: '+21612345678',
      body: 'Rappel match',
    });

    expect(result).toEqual({
      success: true,
      providerMessageId: 'XYZ-1',
      providerStatus: 'ok',
    });
  });

  it('applies the configured default sender when the request has none', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({
        statusCode: 200,
        statusMsg: 'ok',
        messageId: 'XYZ-1',
      }),
    };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig('FootClub') as never,
    );

    await provider.send({ to: '+21612345678', body: 'Rappel match' });

    expect(client.send).toHaveBeenCalledWith(
      expect.objectContaining({ sender: 'FootClub' }),
    );
  });

  it('returns a structured failure (never throws) for a documented TunisieSMS error code', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({
        statusCode: 402,
        statusMsg: 'insufficient credit',
      }),
    };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig() as never,
    );

    const result = await provider.send({
      to: '+21612345678',
      body: 'Rappel match',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INSUFFICIENT_CREDIT');
  });

  it('returns a structured failure for an invalid phone number instead of throwing', async () => {
    const client = { send: jest.fn() };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig() as never,
    );

    const result = await provider.send({
      to: 'not-a-number',
      body: 'Rappel match',
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_PHONE_NUMBER');
    expect(typeof result.errorMessage).toBe('string');
    expect(client.send).not.toHaveBeenCalled();
  });

  it('returns a structured failure for a transport error (timeout/network/parse) instead of throwing', async () => {
    const client = {
      send: jest
        .fn()
        .mockRejectedValue(
          new TunisieSmsTransportError(
            'TIMEOUT',
            'TunisieSMS request timed out',
          ),
        ),
    };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig() as never,
    );

    const result = await provider.send({
      to: '+21612345678',
      body: 'Rappel match',
    });

    expect(result).toEqual({
      success: false,
      errorCode: 'TIMEOUT',
      errorMessage: 'TunisieSMS request timed out',
    });
  });

  it('never logs the account api key or the full phone number', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({
        statusCode: 200,
        statusMsg: 'ok',
        messageId: 'XYZ-1',
      }),
    };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig() as never,
    );

    await provider.send({
      to: '+21612345678',
      body: 'Contient un secret: api_key=super-secret-value',
    });

    const loggedCalls: unknown[][] = [
      ...(logSpy.mock.calls as unknown[][]),
      ...(errorSpy.mock.calls as unknown[][]),
    ];
    const allLoggedText = loggedCalls
      .flat()
      .map((value) =>
        typeof value === 'string' ? value : JSON.stringify(value),
      )
      .join(' ');
    expect(allLoggedText).not.toContain('super-secret-value');
    expect(allLoggedText).not.toContain('+21612345678');
  });

  it('never returns account credentials in the result object', async () => {
    const client = {
      send: jest.fn().mockResolvedValue({
        statusCode: 200,
        statusMsg: 'ok',
        messageId: 'XYZ-1',
      }),
    };
    const provider = new TunisieSmsProvider(
      client as never,
      makeConfig() as never,
    );

    const result = await provider.send({
      to: '+21612345678',
      body: 'Rappel match',
    });

    expect(Object.keys(result)).not.toContain('apiKey');
    expect(Object.keys(result)).not.toContain('api_key');
    expect(Object.keys(result)).not.toContain('id');
  });
});
