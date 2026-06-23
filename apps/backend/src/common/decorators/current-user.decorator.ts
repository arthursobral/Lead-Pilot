import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Param decorator that extracts the authenticated user from the request.
 *
 * Set by JwtStrategy.validate() after token verification.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getMe(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
 *     return user;
 *   }
 *
 * AuthenticatedUser type is defined in the auth module (Phase 2).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
