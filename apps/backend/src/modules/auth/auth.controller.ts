import { Controller, Get } from '@nestjs/common';

/**
 * AuthController
 *
 * Routes:
 *   GET /api/auth/github          - redirects to GitHub OAuth (Phase 2)
 *   GET /api/auth/github/callback - handles OAuth callback (Phase 2)
 *   GET /api/auth/me              - returns authenticated user (Phase 2)
 */
@Controller('auth')
export class AuthController {
  // Routes implemented in Phase 2
}
