/**
 * Application configuration module.
 *
 * Reads required environment variables at import time and exits with code 1
 * if any required variables are missing. This ensures the application never
 * starts in a misconfigured state.
 */

interface AppConfig {
  mongodbUri: string;
  jwtSecret: string;
  sessionSecret: string;
  port: number;
  logLevel: string;
}

const REQUIRED_ENV_VARS = ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'] as const;

function validateEnv(): void {
  const isSimpleRegistrar = process.env.SIMPLE_REGISTRAR === 'true';
  const requiredVars = isSimpleRegistrar 
    ? ['JWT_SECRET', 'SESSION_SECRET'] 
    : ['MONGODB_URI', 'JWT_SECRET', 'SESSION_SECRET'];

  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `[config] Fatal: missing required environment variables: ${missing.join(', ')}. ` +
        'Ensure these are set via Kubernetes Secrets or your environment before starting the server.'
    );
    process.exit(1);
  }
}

// Validation runs immediately when this module is imported.
validateEnv();

const config: AppConfig = {
  mongodbUri: process.env.MONGODB_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  sessionSecret: process.env.SESSION_SECRET as string,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  logLevel: process.env.LOG_LEVEL ?? 'info',
};

export default config;
