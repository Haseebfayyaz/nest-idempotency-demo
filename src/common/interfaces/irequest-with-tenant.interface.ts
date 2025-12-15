import { Request } from 'express';

export interface IRequestWithTenant extends Request {
  tenantId?: string;
}
