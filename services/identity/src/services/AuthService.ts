import { signToken, EventName } from "@fittrack/shared";
import type { UserRepository } from "../repositories/UserRepository";
import type { AuthChallengeRepository } from "../repositories/AuthChallengeRepository";
import type { INotifier } from "../ports/INotifier";
import type { IAuditLogger } from "../ports/IAuditLogger";
import type { IEventPublisher } from "../ports/IEventPublisher";
import { uJavniProfil, type JavniProfil, type Pol } from "../domain/User";
import { hashLozinke, proveriLozinku } from "../utils/password";
import { generisiKod, hashKoda, proveriKod } from "../utils/otp";
import { jeIsteklo, zaMinutaUnapred } from "../utils/dates";
import { maskirajEmail } from "../utils/maskEmail";
import { BadRequest, Conflict, Forbidden, NotFound, Unauthorized } from "../utils/errors";
import { config } from "../config";
import type { SignOptions } from "jsonwebtoken";

export interface RegistracijaKlijenta {
  korisnickoIme: string;
  lozinka: string;
  ime: string;
  prezime: string;
  datumRodjenja?: string | null;
  pol?: Pol | null;
}

export interface RezultatPrijave {
  token: string;
  korisnik: JavniProfil;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly challenges: AuthChallengeRepository,
    private readonly notifier: INotifier,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
  ) {}

  async registrujKlijenta(d: RegistracijaKlijenta): Promise<JavniProfil> {
    if (await this.users.postoji(d.korisnickoIme)) {
      throw Conflict("Korisnik sa datim korisnickim imenom vec postoji");
    }
    const hash = await hashLozinke(d.lozinka);
    const korisnik = await this.users.kreiraj({
      korisnickoIme: d.korisnickoIme,
      lozinka: hash,
      uloga: "klijent",
      ime: d.ime,
      prezime: d.prezime,
      datumRodjenja: d.datumRodjenja ?? null,
      pol: d.pol ?? null,
    });
    await this.notifier.posaljiDobrodoslicu(korisnik.korisnickoIme, korisnik.ime);
    await this.events.objavi(EventName.UserRegistered, {
      userId: korisnik.id,
      korisnickoIme: korisnik.korisnickoIme,
      email: korisnik.korisnickoIme,
      uloga: korisnik.uloga,
      ime: korisnik.ime,
      prezime: korisnik.prezime,
      assignedTrenerId: korisnik.assignedTrenerId,
      blokiran: korisnik.blokiran,
    });
    await this.audit.zabelezi("registracija_klijenta", { korisnickoIme: korisnik.korisnickoIme }, korisnik.id);
    return uJavniProfil(korisnik);
  }

  // 2FA korak 1: provera lozinke i slanje OTP koda
  async prijava(korisnickoIme: string, lozinka: string): Promise<{ challengeId: number; maskiraniEmail: string }> {
    const korisnik = await this.users.nadjiPoKorisnickomImenu(korisnickoIme);
    if (!korisnik) throw Unauthorized("Pogresno korisnicko ime ili lozinka");
    if (korisnik.blokiran) throw Forbidden("Nalog je blokiran");
    const ok = await proveriLozinku(lozinka, korisnik.lozinka);
    if (!ok) throw Unauthorized("Pogresno korisnicko ime ili lozinka");

    const { challengeId } = await this.izdajOtp(korisnik.id, korisnik.korisnickoIme, "login");
    await this.audit.zabelezi("prijava_zapocela", { korisnickoIme }, korisnik.id);
    return { challengeId, maskiraniEmail: maskirajEmail(korisnik.korisnickoIme) };
  }

  // 2FA korak 2: potvrda OTP koda i izdavanje JWT-a
  async potvrdiPrijavu(challengeId: number, kod: string): Promise<RezultatPrijave> {
    const izazov = await this.proveriIzazov(challengeId, kod, "login");
    const korisnik = await this.users.nadjiPoId(izazov.userId);
    if (!korisnik) throw NotFound("Korisnik ne postoji");
    if (korisnik.blokiran) throw Forbidden("Nalog je blokiran");

    await this.challenges.oznaciIskoriscen(izazov.id);
    const token = signToken({
      id: korisnik.id,
      korisnickoIme: korisnik.korisnickoIme,
      uloga: korisnik.uloga,
      blokiran: korisnik.blokiran,
    }, config.jwt.secret, config.jwt.expiresIn as SignOptions["expiresIn"]);

    // Trial trenera se ne racuna ovde: samo objavimo dogadjaj (obradjuje Coaching/Billing).
    if (korisnik.uloga === "trener") {
      // Trial trenera obradjuju Coaching/Billing preko ovog dogadjaja
      await this.events.objavi(EventName.TrainerLoggedIn, {
        trenerId: korisnik.id,
        korisnickoIme: korisnik.korisnickoIme,
      });
      await this.audit.zabelezi("prijava_trenera", { korisnickoIme: korisnik.korisnickoIme }, korisnik.id);
    }
    await this.audit.zabelezi("prijava_uspesna", { korisnickoIme: korisnik.korisnickoIme }, korisnik.id);
    return { token, korisnik: uJavniProfil(korisnik) };
  }

  async zatraziResetLozinke(korisnickoIme: string): Promise<{ maskiraniEmail: string | null }> {
    const korisnik = await this.users.nadjiPoKorisnickomImenu(korisnickoIme);
    // Ne otkrivamo da li nalog postoji.
    if (!korisnik || korisnik.blokiran) return { maskiraniEmail: null };
    await this.izdajOtp(korisnik.id, korisnik.korisnickoIme, "reset");
    await this.audit.zabelezi("reset_zatrazen", { korisnickoIme }, korisnik.id);
    return { maskiraniEmail: maskirajEmail(korisnik.korisnickoIme) };
  }

  async potvrdiReset(challengeId: number, kod: string, novaLozinka: string): Promise<void> {
    const izazov = await this.proveriIzazov(challengeId, kod, "reset");
    await this.challenges.oznaciIskoriscen(izazov.id);
    const hash = await hashLozinke(novaLozinka);
    await this.users.azurirajLozinku(izazov.userId, hash);
    await this.audit.zabelezi("reset_lozinke", {}, izazov.userId);
  }

  async promeniLozinku(userId: number, staraLozinka: string, novaLozinka: string): Promise<void> {
    const korisnik = await this.users.nadjiPoId(userId);
    if (!korisnik) throw NotFound("Korisnik ne postoji");
    const ok = await proveriLozinku(staraLozinka, korisnik.lozinka);
    if (!ok) throw Unauthorized("Stara lozinka nije ispravna");
    const hash = await hashLozinke(novaLozinka);
    await this.users.azurirajLozinku(userId, hash);
    await this.audit.zabelezi("promena_lozinke", {}, userId);
  }

  // ── privatno ──
  private async izdajOtp(userId: number, email: string, namena: "login" | "reset") {
    await this.challenges.ponistiAktivne(userId, namena);
    const kod = generisiKod(config.otp.length);
    const codeHash = await hashKoda(kod);
    const challengeId = await this.challenges.kreiraj(userId, namena, codeHash, zaMinutaUnapred(config.otp.ttlMinutes));
    await this.notifier.posaljiOtp(email, kod, namena);
    return { challengeId };
  }

  private async proveriIzazov(challengeId: number, kod: string, namena: "login" | "reset") {
    const izazov = await this.challenges.nadjiPoId(challengeId);
    if (!izazov || izazov.namena !== namena || izazov.consumedAt) {
      throw BadRequest("Kod nije validan ili je vec iskoriscen");
    }
    if (jeIsteklo(izazov.expiresAt)) throw BadRequest("Kod je istekao");
    if (izazov.attempts >= config.otp.maxAttempts) {
      await this.challenges.oznaciIskoriscen(izazov.id);
      throw BadRequest("Previse pokusaja; zatrazite novi kod");
    }
    const ok = await proveriKod(kod, izazov.codeHash);
    if (!ok) {
      await this.challenges.povecajPokusaje(izazov.id);
      throw BadRequest("Pogresan kod");
    }
    return izazov;
  }
}
