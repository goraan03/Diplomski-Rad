import { EventName } from "@fittrack/shared";
import type { Poruka } from "./Mailer";

export function napraviPoruku(routingKey: string, p: Record<string, unknown>): Poruka | null {
  switch (routingKey) {
    case EventName.EmailOtpRequested: {
      const to = String(p.email ?? "");
      if (!to) return null;
      const svrha = p.namena === "reset" ? "reset lozinke" : "prijavu";
      return {
        to,
        subject: "FitTrack — kod za potvrdu",
        text:
          `Vas kod za ${svrha} je: ${p.kod}\n` +
          `Kod vazi ograniceno vreme. Ako niste vi zatrazili kod, ignorisite ovu poruku.`,
      };
    }
    case EventName.UserRegistered: {
      const to = String(p.email ?? "");
      if (!to) return null;
      const ime = String(p.ime ?? "").trim();
      return {
        to,
        subject: "Dobrodosli u FitTrack",
        text: `Zdravo ${ime}${ime ? "," : ""}\nVas nalog je uspesno kreiran. Zelimo vam uspesan trening!`,
      };
    }
    default:
      return null;
  }
}