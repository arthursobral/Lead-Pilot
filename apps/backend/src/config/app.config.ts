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
  // Personal access token for REST API sync (Day 2).
  // Read via configService.get<string>('github.token') in GithubApiClient.
  // Required scopes: repo (private) or public_repo (public repos only).
  token: process.env.GITHUB_TOKEN ?? '',
  // OAuth fields - reserved for AuthModule GitHub OAuth flow (future phase).
  clientId: process.env.GITHUB_CLIENT_ID ?? '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
  callbackUrl: process.env.GITHUB_CALLBACK_URL ?? '',
}));

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY as string,
}));
