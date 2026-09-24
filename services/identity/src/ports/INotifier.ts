import type { NamenaIzazova } from "../domain/AuthChallenge";

export interface INotifier {
  posaljiOtp(email: string, kod: string, namena: NamenaIzazova): Promise<void>;
  posaljiDobrodoslicu(email: string, ime: string): Promise<void>;
}
