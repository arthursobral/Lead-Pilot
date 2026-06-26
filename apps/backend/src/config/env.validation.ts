import * as Joi from 'joi';

/**
 * Joi schema validated at startup by ConfigModule.
 * The app will throw and refuse to boot if any required variable is missing or invalid.
 * This catches misconfigured deployments immediately rather than at runtime inside a job.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  // App
  API_PORT: Joi.number().default(3001),
  // Full URL of the frontend app. Used by the backend for CORS config.
  WEB_URL: Joi.string().uri().default('http://localhost:3000'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis / BullMQ
  REDIS_URL: Joi.string().required(),

  // Auth
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // GitHub personal access token for REST API sync (Day 2).
  // Required scopes: repo (private repos) or public_repo (public only).
  // Optional at boot: the app runs without GitHub features when absent.
  GITHUB_TOKEN: Joi.string().optional().allow(''),

  // GitHub OAuth -- optional until OAuth flow is implemented
  GITHUB_CLIENT_ID: Joi.string().optional().allow(''),
  GITHUB_CLIENT_SECRET: Joi.string().optional().allow(''),
  GITHUB_CALLBACK_URL: Joi.string().uri().optional().allow(''),

  // OpenAI -- optional in Phase 1 (AI features not yet implemented)
  OPENAI_API_KEY: Joi.string().optional().allow(''),

  // DAY 4 VALIDATION BYPASS -- remove in Phase 5 when auth is implemented.
  // Provides a TeamLead ID for DevelopersController without a JWT token.
  // Must never be set in production -- the app refuses to boot if it is.
  DEV_TEAM_LEAD_ID: Joi.string().optional().allow(''),
});
