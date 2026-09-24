import { Broker, EventName } from "@fittrack/shared";
import type { INotifier } from "../ports/INotifier";
import type { NamenaIzazova } from "../domain/AuthChallenge";

// Adapter porta INotifier preko RabbitMQ magistrale dogadjaja.
export class EventNotifier implements INotifier {
  constructor(private readonly broker: Broker) {}

  async posaljiOtp(email: string, kod: string, namena: NamenaIzazova): Promise<void> {
    await this.broker.publish(EventName.EmailOtpRequested, {
      email,
      kod,
      namena,
      ts: new Date().toISOString(),
    });
  }

  async posaljiDobrodoslicu(email: string, ime: string): Promise<void> {
    await this.broker.publish(EventName.UserRegistered, {
      email,
      ime,
      ts: new Date().toISOString(),
    });
  }
}
