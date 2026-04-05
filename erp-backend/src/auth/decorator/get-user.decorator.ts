import { createParamDecorator, ExecutionContext } from '@nestjs/common';
// Make sure to import Request from express specifically
import { Request } from 'express';

export class UserPayload {
  userId: string;
  email: string;
  roles: string[];
}

// Extend the Express Request to include our user
interface RequestWithUser extends Request {
  user: UserPayload;
}

export const GetUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
