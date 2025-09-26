import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './module/auth/auth/auth.module';
import { AuthRescueModule } from './module/auth/auth-rescue/auth-rescue.module';
import { UserModule } from './module/user/user.module';
import { DeviceModule } from './module/device/device.module';
import { PackModule } from './module/pack/pack.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    AuthRescueModule,
    UserModule,
    DeviceModule,
    PackModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
