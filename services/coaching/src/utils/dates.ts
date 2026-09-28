export function uMysqlDatetime(d: Date): string {
  return new Date(d).toISOString().slice(0, 19).replace("T", " ");
}
