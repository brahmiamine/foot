import { ConfigService } from '@nestjs/config';
import { TunisieSmsProvider } from './tunisiesms.provider';

type FetchCall = [string, { body?: string; headers?: Record<string, string> }];

function configService(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const values: Record<string, string | undefined> = {
    SMS_API_URL: 'https://api.tunisiesms.tn/send',
    SMS_API_KEY: 'test-api-key',
    SMS_SENDER: 'COBeja',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe('TunisieSmsProvider (TS-44/TS-46)', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  function buildProvider(config = configService()): TunisieSmsProvider {
    const provider = new TunisieSmsProvider(config);
    provider.onModuleInit();
    return provider;
  }

  it('is inactive without SMS_API_URL/SMS_API_KEY/SMS_SENDER configured', async () => {
    const provider = buildProvider(configService({ SMS_API_URL: undefined }));

    await expect(
      provider.send({ to: '+21620123456', body: 'Bonjour' }),
    ).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a recipient number that is not valid E.164', async () => {
    const provider = buildProvider();

    await expect(
      provider.send({ to: '20123456', body: 'Bonjour' }),
    ).rejects.toThrow(/Invalid E\.164/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the sender/to/text payload with a Bearer API key (success)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const provider = buildProvider();

    await provider.send({
      to: '+21620123456',
      body: 'Votre commande est prête',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as FetchCall;
    expect(url).toBe('https://api.tunisiesms.tn/send');
    expect(init.headers?.Authorization).toBe('Bearer test-api-key');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      sender: 'COBeja',
      to: '+21620123456',
      text: 'Votre commande est prête',
    });
  });

  it('throws on a 4xx response (e.g. invalid sender)', async () => {
    fetchMock.mockResolvedValue(
      new Response('Invalid sender ID', { status: 400 }),
    );
    const provider = buildProvider();

    await expect(
      provider.send({ to: '+21620123456', body: 'x' }),
    ).rejects.toThrow(/Tunisiesms send failed: 400/);
  });

  it('throws on a 5xx response (provider outage)', async () => {
    fetchMock.mockResolvedValue(
      new Response('Internal error', { status: 503 }),
    );
    const provider = buildProvider();

    await expect(
      provider.send({ to: '+21620123456', body: 'x' }),
    ).rejects.toThrow(/Tunisiesms send failed: 503/);
  });

  it('throws on a network timeout, wrapped with context', async () => {
    fetchMock.mockRejectedValue(
      new DOMException('The operation was aborted', 'TimeoutError'),
    );
    const provider = buildProvider();

    await expect(
      provider.send({ to: '+21620123456', body: 'x' }),
    ).rejects.toThrow(/Tunisiesms request failed/);
  });

  it('propagates every failure to the caller (never swallowed) so the queue worker can retry', async () => {
    // Le retry proprement dit est géré par BullMQ au niveau du worker (voir
    // queue/processors/base-channel.processor.ts) : ce provider n'a qu'un
    // seul contrat à tenir, ne jamais avaler une erreur d'envoi.
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    const provider = buildProvider();

    await expect(
      provider.send({ to: '+21620123456', body: 'x' }),
    ).rejects.toThrow();

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(
      provider.send({ to: '+21620123456', body: 'x' }),
    ).resolves.toBeUndefined();
  });
});
