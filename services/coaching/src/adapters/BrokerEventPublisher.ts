import { EventName, type Broker } from "@fittrack/shared";
import type { IEventPublisher } from "../ports/IEventPublisher";

// Domenski dogadjaji Coaching servisa (rutirajuci kljucevi).
export const COACHING_EVENTS = {
  ProgramAssigned: EventName.ProgramAssigned,
  ClientRequestCreated: EventName.ClientRequestCreated,
  ClientRequestApproved: EventName.ClientRequestApproved,
  ClientRequestRejected: EventName.ClientRequestRejected,
  WorkoutRecorded: EventName.WorkoutRecorded,
} as const;

export class BrokerEventPublisher implements IEventPublisher {
  constructor(private readonly broker: Broker) {}
  async objavi(rutirajuciKljuc: string, payload: Record<string, unknown>): Promise<void> {
    await this.broker.publish(rutirajuciKljuc as EventName, {
      ...payload,
      ts: payload.ts ?? new Date().toISOString(),
    });
  }
}
