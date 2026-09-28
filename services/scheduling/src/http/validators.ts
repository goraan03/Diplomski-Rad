import { BadRequest } from "../utils/errors";
import type { TrainingType } from "../domain/models";

type Telo = Record<string, unknown>;

function ceoBroj(v: unknown, k: string, min = 1): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) throw BadRequest(`Polje '${k}' mora biti ceo broj >= ${min}`);
  return n;
}
function isoDatum(v: unknown, k: string): string {
  if (typeof v !== "string" || !v) throw BadRequest(`Polje '${k}' je obavezno (ISO datum)`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw BadRequest(`Polje '${k}' nije ispravan datum`);
  return v;
}

export const validatori = {
  kreirajTermin(t: Telo) {
    const type = t["type"];
    if (type !== "individual" && type !== "group") throw BadRequest("Polje 'type' mora biti individual ili group");
    const capacity = t["capacity"] == null ? (type === "individual" ? 1 : 10) : ceoBroj(t["capacity"], "capacity", 1);
    return {
      programId: t["programId"] == null ? null : ceoBroj(t["programId"], "programId"),
      type: type as TrainingType,
      startAt: isoDatum(t["startAt"], "startAt"),
      durationMin: ceoBroj(t["durationMin"], "durationMin", 1),
      capacity,
    };
  },
  ocena(t: Telo) {
    const rating = ceoBroj(t["rating"], "rating", 1);
    if (rating > 5) throw BadRequest("Ocena mora biti izmedju 1 i 5");
    const feedback = t["feedback"] == null ? null : String(t["feedback"]).slice(0, 2000);
    return { rating, feedback };
  },
};
