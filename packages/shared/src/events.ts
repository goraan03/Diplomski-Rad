export const EXCHANGE_DEFAULT = "fittrack.events";

export enum EventName {
  UserRegistered = "user.registered",
  TrainerCreated = "trainer.created",
  TrainerLoggedIn = "trainer.logged_in",
  UserBlocked = "user.blocked",
  UserUpdated = "user.updated",
  EmailOtpRequested = "email.otp_requested",
  EmailPasswordResetRequested = "email.password_reset_requested",
  AuditLog = "audit.log",
  ProgramAssigned = "program.assigned",
  ClientRequestCreated = "client_request.created",
  ClientRequestApproved = "client_request.approved",
  ClientRequestRejected = "client_request.rejected",
  WorkoutRecorded = "workout.recorded",
  ProgramCreated = "program.created",
  ProgramUpdated = "program.updated",
  TermCreated = "term.created",
  TermCanceled = "term.canceled",
  TermBooked = "term.booked",
  TermEnrollmentCanceled = "term.enrollment_canceled",
  TermRated = "term.rated",
  TermSessionCompleted = "term.session_completed",
}

export interface UserRegisteredEvent { userId: number; email: string; uloga: string; ime: string; prezime: string; }
export interface TrainerCreatedEvent { userId: number; email: string; ime: string; prezime: string; }
export interface TrainerLoggedInEvent { userId: number; email: string; }
export interface UserBlockedEvent { userId: number; blocked: boolean; }
export interface UserUpdatedEvent { userId: number; ime: string; prezime: string; uloga: string; }

export type EmailPurpose = "login_2fa" | "password_reset" | "change_password";
export interface EmailOtpRequestedEvent { email: string; code: string; purpose: EmailPurpose; }

export type AuditCategory = "Informacija" | "Upozorenje" | "Greska";
export interface AuditLogEvent {
  category: AuditCategory; action: string; userId: number | null; username: string | null;
  details: unknown | null; createdAt: string; source: string;
}