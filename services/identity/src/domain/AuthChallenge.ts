export type NamenaIzazova = "login" | "reset";

export interface AuthChallenge {
  id: number;
  userId: number;
  namena: NamenaIzazova;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  createdAt: Date;
}
