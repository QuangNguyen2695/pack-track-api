export class ForgotPasswordDto {
  identifier: string;
  redirectBaseUrl?: string;
}
export class ResetPasswordDto {
  token: string;
  newPassword: string;
}
