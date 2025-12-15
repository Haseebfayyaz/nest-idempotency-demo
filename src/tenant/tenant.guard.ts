import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestWithTenant } from '../common/interfaces/irequest-with-tenant.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest<IRequestWithTenant>();
    const tenantId = req.get('x-tenant-id');
    if (!tenantId) {
      throw new BadRequestException('X-Tenant-Id required');
    }

    req.tenantId = tenantId;
    return true;
  }
}
