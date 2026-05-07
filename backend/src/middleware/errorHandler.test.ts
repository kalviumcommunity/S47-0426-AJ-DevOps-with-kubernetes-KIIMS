import logger from '../logger/logger';
import { AppError, errorHandler } from './errorHandler';

jest.mock('../logger/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('errorHandler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the AppError response shape and logs error details', () => {
    const req = { path: '/appointments', originalUrl: '/appointments/123' } as never;
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = {
      locals: { requestId: 'req-123' },
      status,
    } as never;
    const next = jest.fn();
    const err = new AppError(422, 'BUSINESS_RULE_VIOLATION', 'Too late to cancel');

    errorHandler(err, req, res, next);

    expect(logger.error).toHaveBeenCalledWith('Unhandled application error', {
      requestId: 'req-123',
      endpoint: '/appointments/123',
      errorMessage: 'Too late to cancel',
      stack: err.stack,
      statusCode: 422,
      errorCode: 'BUSINESS_RULE_VIOLATION',
    });
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Too late to cancel',
        requestId: 'req-123',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});