export interface EventEnvelope<T> {
  id: string;
  type: string;
  source: 'orders-service';
  tenantId: string;
  time: string;
  schemaVersion: '1';
  traceId?: string;
  data: T;
}
