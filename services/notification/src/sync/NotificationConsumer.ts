import { EventName, type Broker } from "@fittrack/shared";
import type { Mailer } from "../mail/Mailer";
import { napraviPoruku } from "../mail/templates";

export class NotificationConsumer {
  constructor(private readonly broker: Broker, private readonly mailer: Mailer) {}

  async start(): Promise<void> {
    await this.broker.consume(
      "notification",
      [EventName.EmailOtpRequested, EventName.UserRegistered],
      async (payload, routingKey) => {
        const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
        const poruka = napraviPoruku(routingKey, p);
        if (!poruka) {
          console.log(`[notification] preskocen '${routingKey}' (nema adrese primaoca)`);
          return;
        }
        await this.mailer.posalji(poruka);
      },
    );
  }
}