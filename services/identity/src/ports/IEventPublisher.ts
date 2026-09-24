import type { EventName } from "@fittrack/shared";

export interface IEventPublisher {
  objavi(dogadjaj: EventName, payload: Record<string, unknown>): Promise<void>;
}
