// request-otp.dto.ts
import { IsIn, IsNotEmpty, IsString, Length } from 'class-validator';

export class RequestAuthRescueDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // email hoặc phone

  @IsIn(['2fa'])
  purpose: 'login' | 'reset_password' | '2fa';
}

export class VerifyAuthRescueDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsIn(['2fa'])
  purpose: 'login' | 'reset_password' | '2fa';

  @IsString()
  token: string;
}
