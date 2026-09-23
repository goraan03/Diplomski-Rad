import amqp, { Channel, ChannelModel } from "amqplib";
import { EXCHANGE_DEFAULT, EventName } from "./events";

type Handler = (payload: unknown, routingKey: string) => Promise<void> | void;

export interface BrokerOptions { url: string; exchange?: string; source: string; }

export class Broker {
  private conn: ChannelModel | null = null;
  private channel: Channel | null = null;
  private connecting: Promise<void> | null = null;
  private readonly exchange: string;

  constructor(private opts: BrokerOptions) { this.exchange = opts.exchange ?? EXCHANGE_DEFAULT; }

  async connect(): Promise<void> {
    if (this.channel) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      try {
        this.conn = await amqp.connect(this.opts.url);
        this.channel = await this.conn.createChannel();
        await this.channel.assertExchange(this.exchange, "topic", { durable: true });
        this.conn.on("close", () => {
          console.warn(`[broker:${this.opts.source}] konekcija zatvorena, reconnect za 3s`);
          this.channel = null; this.conn = null;
          setTimeout(() => void this.connect().catch(() => undefined), 3000);
        });
        this.conn.on("error", (e: Error) => console.error(`[broker:${this.opts.source}] error:`, e.message));
        console.log(`[broker:${this.opts.source}] povezan na exchange "${this.exchange}"`);
      } catch (e) {
        console.warn(`[broker:${this.opts.source}] konekcija neuspesna: ${(e as Error).message}. Reconnect za 3s.`);
        this.channel = null; this.conn = null;
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
    await this.connect();
    if (!this.channel) throw new Error("Broker nije povezan");
    await this.channel.assertQueue(queue, { durable: true });
    for (const rk of routingKeys) await this.channel.bindQueue(queue, this.exchange, rk);
    await this.channel.prefetch(10);
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        await handler(payload, msg.fields.routingKey);
        this.channel!.ack(msg);
      } catch (e) {
        console.error(`[broker:${this.opts.source}] handler greska:`, (e as Error).message);
        this.channel!.nack(msg, false, false);
      }
    });
    console.log(`[broker:${this.opts.source}] slusa queue "${queue}" (${routingKeys.join(", ")})`);
  }

  async close(): Promise<void> {
    try { await this.channel?.close(); await this.conn?.close(); } catch { /* ignore */ }
    this.channel = null; this.conn = null;
  }
}