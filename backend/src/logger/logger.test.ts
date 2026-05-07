import { PassThrough } from 'stream';
import { createLogger } from './logger';

function captureLoggerOutput() {
  const stream = new PassThrough();
  const chunks: string[] = [];

  stream.on('data', (chunk) => {
    chunks.push(chunk.toString());
  });

  return {
    logger: createLogger({ stream, level: 'debug' }),
    read: () => chunks.join(''),
  };
}

describe('logger', () => {
  it('emits valid JSON for log entries', () => {
    const { logger, read } = captureLoggerOutput();

    logger.info('Test log entry', { requestId: 'abc-123', path: '/health/live' });

    const output = read().trim();
    expect(output).toBeTruthy();

    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('Test log entry');
    expect(parsed.requestId).toBe('abc-123');
    expect(parsed.path).toBe('/health/live');
  });

  it('preserves error metadata in JSON output', () => {
    const { logger, read } = captureLoggerOutput();
    const error = new Error('boom');

    logger.error('Unhandled application error', {
      requestId: 'req-1',
      endpoint: '/appointments',
      errorMessage: error.message,
      stack: error.stack,
    });

    const parsed = JSON.parse(read().trim());
    expect(parsed.level).toBe('error');
    expect(parsed.requestId).toBe('req-1');
    expect(parsed.endpoint).toBe('/appointments');
    expect(parsed.errorMessage).toBe('boom');
    expect(parsed.stack).toContain('Error: boom');
  });
});