import {
  ExecutionContext,
  CanActivate,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/role.decorator';
import { Request } from 'express';
import { UserPayload } from '../decorator/get-user.decorator';
import { Role } from '../enums/role.enum';

interface RequestWithUser extends Request {
  user: UserPayload;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('User Authenticated or no roles found');
    }

    const requiredRolesStrings = requiredRoles.map((role) => String(role));

    const userRolesStrings = user.roles.map((role) => String(role));

    const hasRole = requiredRolesStrings.some((role) =>
      userRolesStrings.includes(role),
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Access Denied: Your role [${userRolesStrings.join(', ')}] does not have permission. Required: [${requiredRolesStrings.join(', ')}]`,
      );
    }

    return true;
  }
}
