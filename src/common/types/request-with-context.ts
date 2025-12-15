import { Request } from 'express';

export type RequestWithContext<TBody = unknown> = Request & {
  tenantId: string;
  body: TBody;
};
