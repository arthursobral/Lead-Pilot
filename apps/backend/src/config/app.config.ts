import { registerAs } from '@nestjs/config';

/**
 * Typed configuration namespaces loaded via ConfigModule.
 *
 * Usage inside a service:
 *   constructor(
 *     @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
 *   ) {}
 *
 * Using named namespaces instead of flat process.env access keeps
 * config usage explicit and type-safe throughout the codebase.
 */

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL as string,
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL as string,
}));

export const authConfig = registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
}));

export const githubConfig = registerAs('github', () => ({
  clientId: process.env.GITHUB_CLIENT_ID as string,
  clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
  callbackUrl: process.env.GITHUB_CALLBACK_URL as string,
}));

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY as string,
}));
