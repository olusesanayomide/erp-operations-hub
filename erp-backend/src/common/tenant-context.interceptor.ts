import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserPayload } from 'src/auth/decorator/get-user.decorator';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly tenantContext: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: UserPayload }>();
    const user = request?.user;

    return this.tenantContext.run(
      {
        userId: user?.userId,
        tenantId: user?.tenantId,
        isPlatformAdmin: user?.isPlatformAdmin,
      },
      () => next.handle(),
    );
  }
}
