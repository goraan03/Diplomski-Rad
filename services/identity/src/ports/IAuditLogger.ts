
export interface IAuditLogger {
  zabelezi(akcija: string, detalji: Record<string, unknown>, userId?: number): Promise<void>;
}
