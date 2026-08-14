import {
  CorrelationIdMiddleware,
  CORRELATION_ID_HEADER,
} from './correlation-id.middleware';
import { getCorrelationId } from './correlation-context';

function buildRequest(headerValue?: string) {
  return {
    header: (name: string) =>
      name === CORRELATION_ID_HEADER ? headerValue : undefined,
  } as never;
}

function buildResponse() {
  const headers: Record<string, string> = {};
  return {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    headers,
  };
}

/** TS-57 — correlation ID. */
describe('CorrelationIdMiddleware', () => {
  it('reuses the incoming X-Correlation-Id header when present', () => {
    const middleware = new CorrelationIdMiddleware();
    const res = buildResponse();
    let observedInsideNext: string | undefined;

    middleware.use(buildRequest('incoming-id-123'), res as never, () => {
      observedInsideNext = getCorrelationId();
    });

    expect(observedInsideNext).toBe('incoming-id-123');
    expect(res.headers[CORRELATION_ID_HEADER]).toBe('incoming-id-123');
  });

  it('generates a new correlation id when the header is absent', () => {
    const middleware = new CorrelationIdMiddleware();
    const res = buildResponse();
    let observedInsideNext: string | undefined;

    middleware.use(buildRequest(undefined), res as never, () => {
      observedInsideNext = getCorrelationId();
    });

    expect(observedInsideNext).toBeDefined();
    expect(observedInsideNext).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers[CORRELATION_ID_HEADER]).toBe(observedInsideNext);
  });

  it('generates a new correlation id when the header is blank', () => {
    const middleware = new CorrelationIdMiddleware();
    const res = buildResponse();
    let observedInsideNext: string | undefined;

    middleware.use(buildRequest('   '), res as never, () => {
      observedInsideNext = getCorrelationId();
    });

    expect(observedInsideNext).not.toBe('   ');
    expect(observedInsideNext).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('is undefined outside of any request context', () => {
    expect(getCorrelationId()).toBeUndefined();
  });
});
