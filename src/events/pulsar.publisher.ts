import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventEnvelope } from './event-envelope';
import { correlationStorage } from '../common/interceptors/correlation.interceptor';

type PulsarProducer = {
  send: (opts: { data: Buffer }) => Promise<void>;
  close?: () => Promise<void>;
};

type PulsarClient = {
  createProducer: (opts: { topic: string }) => Promise<PulsarProducer>;
  close?: () => Promise<void>;
};

@Injectable()
export class PulsarPublisher implements OnModuleInit, OnModuleDestroy {
  private client: PulsarClient | null = null;
  private producer: PulsarProducer | null = null;
  private disabled = process.env.PULSAR_DISABLED === 'true';

  async onModuleInit() {
    if (this.disabled) return;
    try {
      // Dynamic import to avoid native binding load when Pulsar is disabled/absent
      const pulsar =
        (await import('pulsar-client')) as typeof import('pulsar-client');
      this.client = new pulsar.Client({
        serviceUrl: process.env.PULSAR_URL ?? 'pulsar://localhost:6650',
      }) as unknown as PulsarClient;
      this.producer = await this.client.createProducer({
        topic: process.env.PULSAR_TOPIC ?? 'persistent://public/default/orders',
      });
    } catch (err) {
      // In local/dev we allow Pulsar to be absent; events will be skipped.
      console.warn('Pulsar unavailable, skipping producer init', err);
      this.producer = null;
    }
  }

  async publish<T>(type: string, tenantId: string, data: T): Promise<void> {
    if (!this.producer) return;
    const traceId = correlationStorage.getStore()?.traceId;

    const envelope: EventEnvelope<T> = {
      id: randomUUID(),
      type,
      source: 'orders-service',
      tenantId,
      time: new Date().toISOString(),
      schemaVersion: '1',
      traceId,
      data,
    };

    await this.producer.send({ data: Buffer.from(JSON.stringify(envelope)) });
  }

  async onModuleDestroy() {
    const producer = this.producer;
    const client = this.client;
    await producer?.close?.();
    await client?.close?.();
  }
}
