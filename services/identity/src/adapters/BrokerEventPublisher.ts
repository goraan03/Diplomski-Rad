import type { Broker, EventName } from "@fittrack/shared";
import type { IEventPublisher } from "../ports/IEventPublisher";

export class BrokerEventPublisher implements IEventPublisher {
  constructor(private readonly broker: Broker) {}

  async objavi(dogadjaj: EventName, payload: Record<string, unknown>): Promise<void> {
    await this.broker.publish(dogadjaj, { ...payload, ts: payload.ts ?? new Date().toISOString() });
  }
}
