export type TrainingType = "individual" | "group";
export type EnrollmentStatus = "enrolled" | "attended" | "canceled_by_user" | "canceled_by_trainer";

export interface TrainingTerm {
  id: number;
  trainerId: number;
  programId: number | null;
  type: TrainingType;
  startAt: Date;
  durationMin: number;
  capacity: number;
  enrolledCount: number;
  canceled: boolean;
}

export interface Enrollment {
  id: number;
  termId: number;
  userId: number;
  status: EnrollmentStatus;
  rating: number | null;
  feedback: string | null;
  sessionCompleted: boolean;
  attendedAt: Date | null;
}
