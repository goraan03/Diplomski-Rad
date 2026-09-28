export function uMysqlDatetime(d: Date): string {
  return new Date(d).toISOString().slice(0, 19).replace("T", " ");
}
export function pocetakNedelje(ref: Date): Date {
  const d = new Date(ref);
  const dan = (d.getDay() + 6) % 7; // ponedeljak = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dan);
  return d;
}
