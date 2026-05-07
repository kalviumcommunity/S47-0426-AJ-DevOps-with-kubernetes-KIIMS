/**
 * Unit tests for backend/src/config.ts
 *
 * config.ts runs validation at import time, so each test uses
 * jest.isolateModules() to re-import the module with a fresh environment.
 */

describe('config startup validation', () => {
  const REQUIRED = {
    MONGODB_URI: 'mongodb://localhost:27017/test',
    JWT_SECRET: 'test-jwt-secret',
    SESSION_SECRET: 'test-session-secret',
  };

  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Spy on process.exit and prevent it from actually terminating the process.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      // no-op — prevents Jest worker from exiting
    }) as (code?: number) => never);

    // Start each test with all required vars set; individual tests will delete
    // the one they want to test as missing.
    process.env.MONGODB_URI = REQUIRED.MONGODB_URI;
    process.env.JWT_SECRET = REQUIRED.JWT_SECRET;
    process.env.SESSION_SECRET = REQUIRED.SESSION_SECRET;
  });

  afterEach(() => {
    exitSpy.mockRestore();
    delete process.env.MONGODB_URI;
    delete process.env.JWT_SECRET;
    delete process.env.SESSION_SECRET;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
  });

  it('exits with code 1 when MONGODB_URI is missing', () => {
    delete process.env.MONGODB_URI;

    jest.isolateModules(() => {
      require('./config');
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;

    jest.isolateModules(() => {
      require('./config');
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 when SESSION_SECRET is missing', () => {
    delete process.env.SESSION_SECRET;

    jest.isolateModules(() => {
      require('./config');
    });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does not exit when all required environment variables are present', () => {
    jest.isolateModules(() => {
      require('./config');
    });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exports PORT defaulting to 4000 when PORT env var is not set', () => {
    let cfg: { default: { port: number } } | undefined;

    jest.isolateModules(() => {
      cfg = require('./config');
    });

    expect(cfg?.default.port).toBe(4000);
  });

  it('exports the PORT value from the environment when set', () => {
    process.env.PORT = '5000';
    let cfg: { default: { port: number } } | undefined;

    jest.isolateModules(() => {
      cfg = require('./config');
    });

    expect(cfg?.default.port).toBe(5000);
  });

  it('exports LOG_LEVEL defaulting to "info" when LOG_LEVEL env var is not set', () => {
    let cfg: { default: { logLevel: string } } | undefined;

    jest.isolateModules(() => {
      cfg = require('./config');
    });

    expect(cfg?.default.logLevel).toBe('info');
  });
});
