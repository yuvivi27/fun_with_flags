import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

type AuthRequest = Request & {
  user?: {
    sub: string;
    email: string;
  };
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return request.user;
  },
);
