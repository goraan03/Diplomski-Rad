import { EventName, type Broker } from "@fittrack/shared";
import type { IEventPublisher } from "../ports/IEventPublisher";

export const SCHEDULING_EVENTS = {
  TermCreated: EventName.TermCreated,
  TermCanceled: EventName.TermCanceled,
  TermBooked: EventName.TermBooked,
  EnrollmentCanceled: EventName.TermEnrollmentCanceled,
  TermRated: EventName.TermRated,
  SessionCompleted: EventName.TermSessionCompleted,
} as const;

export class BrokerEventPublisher implements IEventPublisher {
  constructor(private readonly broker: Broker) {}
  async objavi(rutirajuciKljuc: string, payload: Record<string, unknown>): Promise<void> {
    await this.broker.publish(rutirajuciKljuc as EventName, {
      ...payload, ts: payload.ts ?? new Date().toISOString(),
    });
  }
}
