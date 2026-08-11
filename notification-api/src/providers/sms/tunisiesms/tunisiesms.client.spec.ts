import { of, throwError } from 'rxjs';
import { TunisieSmsTransportError } from './tunisiesms.exceptions';
import { TunisieSmsClient } from './tunisiesms.client';

function makeConfig(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    TUNISIESMS_API_URL: 'https://api.tunisiesms.tn/send',
    TUNISIESMS_ID: 'account-id',
    TUNISIESMS_API_KEY: 'secret-api-key',
    TUNISIESMS_TIMEOUT_MS: 10_000,
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) };
}

function makeHttp(postImpl: (...args: unknown[]) => ReturnType<typeof of>) {
  return { post: jest.fn(postImpl) };
}

function buildClient(
  configOverrides: Record<string, unknown> = {},
  postImpl: (...args: unknown[]) => ReturnType<typeof of> = () =>
    of({ status: 200, data: '' }),
) {
  const config = makeConfig(configOverrides);
  const http = makeHttp(postImpl);
  const client = new TunisieSmsClient(config as never, http as never);
  client.onModuleInit();
  return { client, http };
}

const XML_SUCCESS = `<?xml version="1.0" encoding="UTF-8" ?>
<response>
  <status>
    <status_code>200</status_code>
    <status_msg>ok</status_msg>
    <message_id>XXXX</message_id>
  </status>
</response>`;

describe('TunisieSmsClient', () => {
  it('rejects with NOT_CONFIGURED when credentials are missing', async () => {
    const { client } = buildClient({ TUNISIESMS_API_URL: undefined });

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
  });

  it('parses a successful XML response as documented by TunisieSMS', async () => {
    const { client } = buildClient({}, () =>
      of({ status: 200, data: XML_SUCCESS }),
    );

    const result = await client.send({
      destination: '+21612345678',
      content: 'hi',
    });

    expect(result).toEqual({
      statusCode: 200,
      statusMsg: 'ok',
      messageId: 'XXXX',
    });
  });

  it('parses a flat JSON response with the same field names', async () => {
    const json = JSON.stringify({
      status_code: 200,
      status_msg: 'ok',
      message_id: 'XXXX',
    });
    const { client } = buildClient({}, () => of({ status: 200, data: json }));

    const result = await client.send({
      destination: '+21612345678',
      content: 'hi',
    });

    expect(result).toEqual({
      statusCode: 200,
      statusMsg: 'ok',
      messageId: 'XXXX',
    });
  });

  it('sends the account id/api_key alongside the message fields', async () => {
    const { client, http } = buildClient({}, () =>
      of({ status: 200, data: XML_SUCCESS }),
    );

    await client.send({
      destination: '+21612345678',
      content: 'hi',
      sender: 'FootClub',
    });

    expect(http.post).toHaveBeenCalledWith(
      'https://api.tunisiesms.tn/send',
      {
        id: 'account-id',
        api_key: 'secret-api-key',
        destination: '+21612345678',
        content: 'hi',
        sender: 'FootClub',
      },
      expect.any(Object),
    );
  });

  it('maps a timeout to a TIMEOUT transport error', async () => {
    const { client } = buildClient({}, () =>
      throwError(() =>
        Object.assign(new Error('timeout of 10000ms exceeded'), {
          code: 'ECONNABORTED',
        }),
      ),
    );

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('maps a network error to a NETWORK_ERROR transport error', async () => {
    const { client } = buildClient({}, () =>
      throwError(() =>
        Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      ),
    );

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('maps an HTTP 5xx response to an HTTP_ERROR transport error', async () => {
    const { client } = buildClient({}, () =>
      of({ status: 500, data: 'Internal Server Error' }),
    );

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'HTTP_ERROR' });
  });

  it('rejects an invalid XML response instead of treating it as a success', async () => {
    const { client } = buildClient({}, () =>
      of({
        status: 200,
        data: '<response><status><status_code>200</status_code>',
      }),
    );

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects an invalid JSON response instead of treating it as a success', async () => {
    const { client } = buildClient({}, () =>
      of({ status: 200, data: '{not valid json' }),
    );

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects a response with no status at all', async () => {
    const { client } = buildClient({}, () => of({ status: 200, data: '' }));

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects a response missing status_code', async () => {
    const xml = `<response><status><status_msg>ok</status_msg></status></response>`;
    const { client } = buildClient({}, () => of({ status: 200, data: xml }));

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects a status_code=200 response missing message_id (never a silent success)', async () => {
    const xml = `<response><status><status_code>200</status_code><status_msg>ok</status_msg></status></response>`;
    const { client } = buildClient({}, () => of({ status: 200, data: xml }));

    await expect(
      client.send({ destination: '+21612345678', content: 'hi' }),
    ).rejects.toBeInstanceOf(TunisieSmsTransportError);
  });

  it('accepts an error status_code without requiring a message_id', async () => {
    const xml = `<response><status><status_code>402</status_code><status_msg>insufficient credit</status_msg></status></response>`;
    const { client } = buildClient({}, () => of({ status: 200, data: xml }));

    const result = await client.send({
      destination: '+21612345678',
      content: 'hi',
    });

    expect(result).toEqual({
      statusCode: 402,
      statusMsg: 'insufficient credit',
      messageId: undefined,
    });
  });
});
