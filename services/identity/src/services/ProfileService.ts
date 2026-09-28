import type { UserRepository } from "../repositories/UserRepository";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { EventName } from "@fittrack/shared";
import { uJavniProfil, type JavniProfil, type Pol } from "../domain/User";
import { NotFound } from "../utils/errors";

export interface IzmenaProfila {
  ime?: string;
  prezime?: string;
  datumRodjenja?: string | null;
  pol?: Pol | null;
}

export class ProfileService {
  constructor(
    private readonly users: UserRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  async mojProfil(userId: number): Promise<JavniProfil> {
    const korisnik = await this.users.nadjiPoId(userId);
    if (!korisnik) throw NotFound("Korisnik ne postoji");
    return uJavniProfil(korisnik);
  }

  async izmeniProfil(userId: number, izmena: IzmenaProfila): Promise<JavniProfil> {
    const postojeciKorisnik = await this.users.nadjiPoId(userId);
    if (!postojeciKorisnik) throw NotFound("Korisnik ne postoji");
    await this.users.azurirajProfil(userId, izmena);
    await this.audit.zabelezi("izmena_profila", { polja: Object.keys(izmena) }, userId);
    const korisnik = await this.mojProfil(userId);
    await this.events.objavi(EventName.UserUpdated, {
      userId: korisnik.id,
      korisnickoIme: korisnik.korisnickoIme,
      email: korisnik.korisnickoIme,
      uloga: korisnik.uloga,
      ime: korisnik.ime,
      prezime: korisnik.prezime,
      assignedTrenerId: korisnik.assignedTrenerId,
      blokiran: korisnik.blokiran,
    });
    return korisnik;
  }
}
