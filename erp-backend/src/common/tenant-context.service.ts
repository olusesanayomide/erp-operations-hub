import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export type TenantRequestContext = {
  tenantId?: string;
  userId?: string;
  isPlatformAdmin?: boolean;
};

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantRequestContext>();

  run<T>(context: TenantRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getStore() {
    return this.storage.getStore();
  }

  getTenantId() {
    return this.storage.getStore()?.tenantId;
  }

  isPlatformAdmin() {
    return this.storage.getStore()?.isPlatformAdmin === true;
  }
}
