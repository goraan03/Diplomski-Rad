import type { UserRepository } from "../repositories/UserRepository";
import type { INotifier } from "../ports/INotifier";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { EventName } from "@fittrack/shared";
import { uJavniProfil, type JavniProfil, type Uloga } from "../domain/User";
import { hashLozinke } from "../utils/password";
import { BadRequest, Conflict, Forbidden, NotFound } from "../utils/errors";

export interface NoviTrener {
  korisnickoIme: string;
  lozinka: string;
  ime: string;
  prezime: string;
}

export class UserAdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly notifier: INotifier,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  async lista(filter: { uloga?: Uloga; q?: string }): Promise<JavniProfil[]> {
    const korisnici = await this.users.lista(filter);
    return korisnici.map(uJavniProfil);
  }

  async kreirajTrenera(d: NoviTrener, adminId: number): Promise<JavniProfil> {
    if (await this.users.postoji(d.korisnickoIme)) {
      throw Conflict("Korisnik sa datim korisnickim imenom vec postoji");
    }
    const hash = await hashLozinke(d.lozinka);
    const trener = await this.users.kreiraj({
      korisnickoIme: d.korisnickoIme,
      lozinka: hash,
      uloga: "trener",
      ime: d.ime,
      prezime: d.prezime,
    });
    await this.notifier.posaljiDobrodoslicu(trener.korisnickoIme, trener.ime);
    await this.events.objavi(EventName.TrainerCreated, {
      userId: trener.id,
      korisnickoIme: trener.korisnickoIme,
      email: trener.korisnickoIme,
      uloga: trener.uloga,
      ime: trener.ime,
      prezime: trener.prezime,
      assignedTrenerId: trener.assignedTrenerId,
      blokiran: trener.blokiran,
    });
    await this.audit.zabelezi("kreiran_trener", { korisnickoIme: trener.korisnickoIme }, adminId);
    return uJavniProfil(trener);
  }

  async postaviBlokiran(korisnikId: number, blokiran: boolean, adminId: number): Promise<void> {
    const korisnik = await this.users.nadjiPoId(korisnikId);
    if (!korisnik) throw NotFound("Korisnik ne postoji");
    if (korisnik.uloga === "admin") throw Forbidden("Administrator se ne moze blokirati");
    await this.users.postaviBlokiran(korisnikId, blokiran);
    await this.events.objavi(EventName.UserBlocked, { userId: korisnikId, blocked: blokiran });
    await this.audit.zabelezi(blokiran ? "korisnik_blokiran" : "korisnik_odblokiran", { korisnikId }, adminId);
  }

  async dodeliTrenera(klijentId: number, trenerId: number | null, adminId: number): Promise<void> {
    const klijent = await this.users.nadjiPoId(klijentId);
    if (!klijent || klijent.uloga !== "klijent") throw NotFound("Klijent ne postoji");
    if (trenerId !== null) {
      const trener = await this.users.nadjiPoId(trenerId);
      if (!trener || trener.uloga !== "trener") throw BadRequest("Navedeni trener ne postoji");
    }
    await this.users.postaviTrenera(klijentId, trenerId);
    const azuriran = await this.users.nadjiPoId(klijentId);
    if (azuriran) {
      await this.events.objavi(EventName.UserUpdated, {
        userId: azuriran.id,
        korisnickoIme: azuriran.korisnickoIme,
        email: azuriran.korisnickoIme,
        uloga: azuriran.uloga,
        ime: azuriran.ime,
        prezime: azuriran.prezime,
        assignedTrenerId: azuriran.assignedTrenerId,
        blokiran: azuriran.blokiran,
      });
    }
    await this.audit.zabelezi("dodela_trenera", { klijentId, trenerId }, adminId);
  }
}
