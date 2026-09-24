export function zaMinutaUnapred(minuta: number): Date {
  return new Date(Date.now() + minuta * 60 * 1000);
}

export function jeIsteklo(datum: Date): boolean {
  return datum.getTime() <= Date.now();
}

// MySQL DATETIME format 'YYYY-MM-DD HH:MM:SS'
export function uMysqlDatetime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
