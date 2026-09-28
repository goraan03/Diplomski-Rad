export type Nivo = "beginner" | "intermediate" | "advanced";
export type StatusZahteva = "pending" | "approved" | "rejected";
export type StatusDodele = "active" | "inactive";

export interface Exercise {
  id: number;
  trainerId: number;
  name: string;
  description: string | null;
  muscleGroup: string;
  equipment: string;
  level: Nivo;
  videoUrl: string | null;
  createdAt: Date;
}

export interface Program {
  id: number;
  trainerId: number;
  title: string;
  description: string | null;
  level: Nivo;
  isPublic: boolean;
  createdAt: Date;
}

export interface ProgramExercise {
  programId: number;
  exerciseId: number;
  position: number;
  sets: number | null;
  reps: string | null;
  tempo: string | null;
  restSec: number | null;
  notes: string | null;
}

export interface ClientRequest {
  id: number;
  clientId: number;
  trainerId: number;
  status: StatusZahteva;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface WorkoutLogItem {
  exerciseId: number;
  setNumber: number;
  plannedReps?: string | null;
  actualReps: number;
  plannedWeight?: number | null;
  actualWeight: number;
}
