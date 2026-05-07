import { createLogger as createWinstonLogger, format, transports } from 'winston';

export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  level?: string;
  stream?: NodeJS.WritableStream;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? process.env.LOG_LEVEL ?? 'info';
  const stream = options.stream ?? process.stdout;

  return createWinstonLogger({
    level,
    format: format.combine(format.errors({ stack: true }), format.timestamp(), format.json()),
    transports: [
      new transports.Stream({ stream }),
    ],
  });
}

const logger = createLogger();

export default logger;