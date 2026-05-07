import logger from '../logger/logger';
import { requestLogger } from './requestLogger';
import { metricsCollector } from '../metrics/metrics';

jest.mock('../logger/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../metrics/metrics', () => ({
  __esModule: true,
  metricsCollector: {
    incrementActiveConnections: jest.fn(),
    decrementActiveConnections: jest.fn(),
    recordRequest: jest.fn(),
  },
}));

describe('requestLogger middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1260);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('assigns a requestId and logs request metadata on finish', () => {
    const listeners: Record<string, Array<() => void>> = {};
    const req = {
      method: 'GET',
      path: '/health/live',
      headers: {},
    } as never;
    const res = {
      locals: {},
      statusCode: 200,
      on(event: string, handler: () => void) {
        if (!listeners[event]) {
          listeners[event] = [];
        }
        listeners[event].push(handler);
        return this;
      },
    } as never;
    const next = jest.fn();

    requestLogger(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect((res as { locals: { requestId: string } }).locals.requestId).toBeTruthy();
    expect(metricsCollector.incrementActiveConnections).toHaveBeenCalledTimes(1);

    listeners.finish[0]();

    expect(metricsCollector.decrementActiveConnections).toHaveBeenCalledTimes(1);
    expect(metricsCollector.recordRequest).toHaveBeenCalledWith('/health/live', 'GET', 200, 260);

    expect(logger.info).toHaveBeenCalledWith('HTTP request completed', {
      requestId: (res as { locals: { requestId: string } }).locals.requestId,
      method: 'GET',
      path: '/health/live',
      statusCode: 200,
      durationMs: 260,
    });
  });
});