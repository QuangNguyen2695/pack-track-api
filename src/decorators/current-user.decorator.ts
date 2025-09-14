import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserTokenDto } from '@/jwt/dto/user-token.dto';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): UserTokenDto => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as UserTokenDto;
});
