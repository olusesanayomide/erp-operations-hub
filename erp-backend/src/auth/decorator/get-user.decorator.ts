import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export class UserPayload {
  userId: string;
  tenantId: string;
  email: string;
  name?: string | null;
  roles: string[];
  isPlatformAdmin: boolean;
  createdAt?: Date;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
}

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
