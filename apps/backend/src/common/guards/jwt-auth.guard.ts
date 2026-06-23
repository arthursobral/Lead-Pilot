import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT authentication guard.
 *
 * Extends Passport's AuthGuard('jwt') which validates the Bearer token
 * from the Authorization header using the JwtStrategy (defined in AuthModule).
 *
 * Applied per-route with @UseGuards(JwtAuthGuard).
 * Global application is not recommended — some routes (login, health) are public.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
