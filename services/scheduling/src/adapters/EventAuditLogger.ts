import { Broker, EventName } from "@fittrack/shared";
import type { IAuditLogger } from "../ports/IAuditLogger";
export class EventAuditLogger implements IAuditLogger {
  constructor(private readonly broker: Broker) {}
  async zabelezi(akcija: string, detalji: Record<string, unknown>, userId?: number): Promise<void> {
    await this.broker.publish(EventName.AuditLog, {
      servis: "scheduling", akcija, userId: userId ?? null, detalji, ts: new Date().toISOString(),
    });
  }
}
