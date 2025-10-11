import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthRewardController } from './auth-reward.controller';
import { AuthRewardService } from './auth-reward.service';
import { GoogleSsvVerifier } from './ssv/google-ssv-verifier';
import { AuthRewardNonce, AuthRewardNonceSchema } from './schemas/auth-reward-nonce.schema';
import { AuthRewardEvent, AuthRewardEventSchema } from './schemas/auth-reward-event.schema';
import { UserSubscriptionUsageModule } from '../../user-subscription-usage/user-subscription-usage.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AuthRewardNonce.name, schema: AuthRewardNonceSchema },
      { name: AuthRewardEvent.name, schema: AuthRewardEventSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('AUTH_REWARD_JWT_SECRET') || 'dev-secret-change-me',
        // no expiresIn: nonce lives until replaced/used
      }),
    }),
    forwardRef(() => UserSubscriptionUsageModule), // Import để có thể inject UserSubscriptionUsageService
  ],
  controllers: [AuthRewardController],
  providers: [AuthRewardService, GoogleSsvVerifier],
  exports: [AuthRewardService],
})
export class AuthRewardModule {}
