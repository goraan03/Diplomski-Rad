import amqp, { Channel, ChannelModel } from "amqplib";
import { EXCHANGE_DEFAULT, EventName } from "./events";

type Handler = (payload: unknown, routingKey: string) => Promise<void> | void;
interface ConsumerRegistration { queue: string; routingKeys: EventName[]; handler: Handler; }

export interface BrokerOptions { url: string; exchange?: string; source: string; }

export class Broker {
  private conn: ChannelModel | null = null;
  private channel: Channel | null = null;
  private connecting: Promise<void> | null = null;
  private readonly exchange: string;
  private readonly consumers = new Map<string, ConsumerRegistration>();
  private readonly activeConsumers = new Map<string, Channel>();

  constructor(private opts: BrokerOptions) { this.exchange = opts.exchange ?? EXCHANGE_DEFAULT; }

  async connect(): Promise<void> {
    if (this.channel) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      try {
        const conn = await amqp.connect(this.opts.url);
        const channel = await conn.createChannel();
        this.conn = conn;
        this.channel = channel;
        await channel.assertExchange(this.exchange, "topic", { durable: true });
        conn.on("close", () => {
          console.warn(`[broker:${this.opts.source}] konekcija zatvorena, reconnect za 3s`);
          if (this.conn === conn) {
            this.channel = null;
            this.conn = null;
            this.activeConsumers.clear();
          }
          setTimeout(() => void this.connect().catch(() => undefined), 3000);
        });
        conn.on("error", (e: Error) => console.error(`[broker:${this.opts.source}] error:`, e.message));
        await this.restoreConsumers();
        console.log(`[broker:${this.opts.source}] povezan na exchange "${this.exchange}"`);
      } catch (e) {
        console.warn(`[broker:${this.opts.source}] konekcija neuspesna: ${(e as Error).message}. Reconnect za 3s.`);
        this.channel = null; this.conn = null;
        this.activeConsumers.clear();
        setTimeout(() => void this.connect().catch(() => undefined), 3000);
      } finally { this.connecting = null; }
    })();
    return this.connecting;
  }

  async publish(event: EventName, payload: unknown): Promise<void> {
    if (!this.channel) await this.connect();
    if (!this.channel) { console.warn(`[broker:${this.opts.source}] SKIP publish "${event}" — broker nedostupan`); return; }
    const body = Buffer.from(JSON.stringify(payload));
    this.channel.publish(this.exchange, event, body, { contentType: "application/json", persistent: true, timestamp: Date.now(), appId: this.opts.source });
  }

  async consume(queue: string, routingKeys: EventName[], handler: Handler): Promise<void> {
    const registration = { queue, routingKeys, handler };
    this.consumers.set(queue, registration);
    await this.connect();
    await this.registerConsumer(registration);
  }

  private async restoreConsumers(): Promise<void> {
    for (const consumer of this.consumers.values()) await this.registerConsumer(consumer);
  }

  private async registerConsumer(consumer: ConsumerRegistration): Promise<void> {
    const channel = this.channel;
    if (!channel) throw new Error("Broker nije povezan");
    if (this.activeConsumers.get(consumer.queue) === channel) return;
    await channel.assertQueue(consumer.queue, { durable: true });
    for (const rk of consumer.routingKeys) await channel.bindQueue(consumer.queue, this.exchange, rk);
    await channel.prefetch(10);
    await channel.consume(consumer.queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await consumer.handler(payload, msg.fields.routingKey);
        channel.ack(msg);
      } catch (e) {
        console.error(`[broker:${this.opts.source}] handler greska:`, (e as Error).message);
        try { channel.nack(msg, false, true); } catch { /* connection closed */ }
      }
    });
    this.activeConsumers.set(consumer.queue, channel);
    console.log(`[broker:${this.opts.source}] slusa queue "${consumer.queue}" (${consumer.routingKeys.join(", ")})`);
  }

  async close(): Promise<void> {
    try { await this.channel?.close(); await this.conn?.close(); } catch { /* ignore */ }
    this.channel = null; this.conn = null;
  }
}