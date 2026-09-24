export function maskirajEmail(adresa: string): string {
  const at = adresa.indexOf("@");
  if (at <= 0) {
    return adresa.length <= 1 ? "*" : adresa[0] + "***";
  }
  const ime = adresa.slice(0, at);
  const domen = adresa.slice(at);
  const vidljivo = ime.slice(0, 1);
  return `${vidljivo}***${domen}`;
}
