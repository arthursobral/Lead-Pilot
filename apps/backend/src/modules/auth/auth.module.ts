import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule handles GitHub OAuth and JWT issuance.
 *
 * JwtModule is configured async so it reads JWT_SECRET from ConfigService
 * after env validation has already run. This avoids the undefined-at-boot risk
 * of referencing process.env directly inside a static decorator.
 *
 * JwtStrategy is registered here so guarded routes return 401 (not 500).
 * GithubStrategy is added in Phase 2 alongside the OAuth callback handler.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: { expiresIn: config.get<string>('auth.jwtExpiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
