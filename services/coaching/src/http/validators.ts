import { BadRequest } from "../utils/errors";
import type { Nivo } from "../domain/models";

type Telo = Record<string, unknown>;

function str(t: Telo, k: string, obavezno = true, min = 1, max = 500): string | undefined {
  const v = t[k];
  if (v === undefined || v === null || v === "") {
    if (obavezno) throw BadRequest(`Polje '${k}' je obavezno`);
    return undefined;
  }
  if (typeof v !== "string") throw BadRequest(`Polje '${k}' mora biti tekst`);
  const s = v.trim();
  if (s.length < min) throw BadRequest(`Polje '${k}' mora imati najmanje ${min} znakova`);
  if (s.length > max) throw BadRequest(`Polje '${k}' je predugacko`);
  return s;
}
function nivo(t: Telo, obavezno = true): Nivo | undefined {
  const v = t["level"];
  if (v === undefined || v === null || v === "") {
    if (obavezno) throw BadRequest("Polje 'level' je obavezno");
    return undefined;
  }
  if (v !== "beginner" && v !== "intermediate" && v !== "advanced") throw BadRequest("Neispravan 'level'");
  return v;
}
function bool(t: Telo, k: string, podr = false): boolean {
  const v = t[k];
  if (v === undefined || v === null) return podr;
  return v === true || v === 1 || v === "true" || v === "1";
}
function ceoBroj(v: unknown, k: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw BadRequest(`Polje '${k}' mora biti pozitivan ceo broj`);
  return n;
}
function brOpc(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) throw BadRequest("Neispravna numericka vrednost");
  return n;
}

export const validatori = {
  vezba(t: Telo) {
    return {
      name: str(t, "name", true, 1, 150)!,
      description: str(t, "description", false, 1, 5000) ?? null,
      muscleGroup: str(t, "muscleGroup", true, 1, 80)!,
      equipment: str(t, "equipment", false, 1, 80) ?? "none",
      level: nivo(t, false) ?? "beginner",
      videoUrl: str(t, "videoUrl", false, 1, 500) ?? null,
    };
  },
  vezbaIzmena(t: Telo) {
    return {
      name: str(t, "name", false, 1, 150),
      description: t["description"] === undefined ? undefined : (str(t, "description", false) ?? null),
      muscleGroup: str(t, "muscleGroup", false, 1, 80),
      equipment: str(t, "equipment", false, 1, 80),
      level: nivo(t, false),
      videoUrl: t["videoUrl"] === undefined ? undefined : (str(t, "videoUrl", false) ?? null),
    };
  },
  program(t: Telo) {
    return {
      title: str(t, "title", true, 1, 200)!,
      description: str(t, "description", false, 1, 5000) ?? null,
      level: nivo(t, false) ?? "beginner",
      isPublic: bool(t, "isPublic", false),
    };
  },
  programIzmena(t: Telo) {
    return {
      title: str(t, "title", false, 1, 200),
      description: t["description"] === undefined ? undefined : (str(t, "description", false) ?? null),
      level: nivo(t, false),
      isPublic: t["isPublic"] === undefined ? undefined : bool(t, "isPublic"),
    };
  },
  programVezbe(t: Telo) {
    const stavke = t["items"];
    if (!Array.isArray(stavke)) throw BadRequest("Polje 'items' mora biti niz");
    return stavke.map((it: Record<string, unknown>, i: number) => ({
      exerciseId: ceoBroj(it.exerciseId, "exerciseId"),
      position: Number.isInteger(Number(it.position)) ? Number(it.position) : i,
      sets: brOpc(it.sets),
      reps: it.reps == null ? null : String(it.reps),
      tempo: it.tempo == null ? null : String(it.tempo),
      restSec: brOpc(it.restSec),
      notes: it.notes == null ? null : String(it.notes),
    }));
  },
  dodela(t: Telo) {
    return { clientId: ceoBroj(t["clientId"], "clientId") };
  },
  zahtev(t: Telo) {
    return { trainerId: ceoBroj(t["trainerId"], "trainerId") };
  },
  trening(t: Telo) {
    const logs = t["logs"];
    if (!Array.isArray(logs)) throw BadRequest("Polje 'logs' mora biti niz");
    return {
      termId: t["termId"] == null ? null : ceoBroj(t["termId"], "termId"),
      clientId: ceoBroj(t["clientId"], "clientId"),
      startTime: str(t, "startTime", true)!,
      endTime: str(t, "endTime", true)!,
      notes: str(t, "notes", false, 1, 5000) ?? null,
      logs: logs.map((l: Record<string, unknown>) => ({
        exerciseId: ceoBroj(l.exerciseId, "exerciseId"),
        setNumber: ceoBroj(l.setNumber, "setNumber"),
        plannedReps: l.plannedReps == null ? null : String(l.plannedReps),
        actualReps: Number(l.actualReps),
        plannedWeight: brOpc(l.plannedWeight),
        actualWeight: Number(l.actualWeight),
      })),
    };
  },
};
