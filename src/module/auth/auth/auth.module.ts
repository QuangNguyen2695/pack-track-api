// auth.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from '@/jwt/local.strategy';
import { JwtStrategy } from '@/jwt/jwt.strategy';
import { AuthRescueModule } from '../auth-rescue/auth-rescue.module';
import { UserModule } from '@/module/user/user.module';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AuthRescueModule),
    forwardRef(() => PassportModule),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1y' },
      }),
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    {
      provide: 'RESET_JWT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('RESET_JWT_SECRET')!, // khác với JWT_SECRET
          signOptions: {
            issuer: 'your-api',
            audience: 'password-reset',
            expiresIn: config.get<string>('RESET_TOKEN_TTL') ?? '15m',
          },
        }),
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, 'RESET_JWT'],
})
export class AuthModule {}
