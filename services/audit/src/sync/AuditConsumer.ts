import { EventName, type Broker } from "@fittrack/shared";
import type { AuditRepository } from "../repositories/AuditRepository";

export class AuditConsumer {
  constructor(private readonly broker: Broker, private readonly repo: AuditRepository) {}

  async start(): Promise<void> {
    const sviDogadjaji = Object.values(EventName) as EventName[];
    await this.broker.consume("audit.events", sviDogadjaji, async (payload, routingKey) => {
      const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
      if (routingKey === EventName.AuditLog) {
        await this.repo.upisi({
          servis: String(p.servis ?? "nepoznato"),
          akcija: String(p.akcija ?? routingKey),
          userId: p.userId != null ? Number(p.userId) : null,
          detalji: (p.detalji as Record<string, unknown>) ?? null,
        });
      } else {
        await this.repo.upisi({
          servis: this.servisIzKljuca(routingKey),
          akcija: routingKey,
          userId: this.userIdIz(p),
          detalji: p,
        });
      }
    });
  }

  private servisIzKljuca(k: string): string {
    if (k.startsWith("user.") || k.startsWith("trainer.") || k.startsWith("email.")) return "identity";
    if (k.startsWith("program.") || k.startsWith("client_request.") || k.startsWith("workout.")) return "coaching";
    if (k.startsWith("term.")) return "scheduling";
    return "nepoznato";
  }

  private userIdIz(p: Record<string, unknown>): number | null {
    const c = p.userId ?? p.clientId ?? p.trainerId ?? p.id;
    return c != null ? Number(c) : null;
  }
}