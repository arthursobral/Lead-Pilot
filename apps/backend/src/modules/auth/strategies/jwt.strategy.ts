import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../types/auth.types';

/**
 * JWT payload shape as issued by AuthService (Phase 2).
 *
 * sub: TeamLead primary key (standard JWT subject claim).
 * email: included for logging and display without a DB round-trip.
 */
interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * JwtStrategy validates the Bearer token on every guarded request.
 *
 * It reads the secret from the validated config namespace (auth.jwtSecret)
 * so the secret is never hardcoded and is always consistent with what
 * AuthService will use to sign tokens in Phase 2.
 *
 * validate() returns the AuthenticatedUser shape, which NestJS attaches
 * to request.user. The @CurrentUser() decorator then extracts it.
 *
 * Throws UnauthorizedException if the token is missing, expired, or
 * tampered with -- Passport handles this before validate() is called.
 * The explicit throw in validate() guards against a well-formed token
 * whose subject does not map to a real user (handled in Phase 2 when
 * AuthService can verify the TeamLead exists in the database).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email };
  }
}
