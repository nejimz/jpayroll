/** Money helpers — always use integer centavos. Never use float for pay math. */

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100;
}

export function formatPhp(centavos: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(centavosToPesos(centavos));
}

export function parsePesosInput(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  if (Number.isNaN(n)) throw new Error("Invalid amount");
  return pesosToCentavos(n);
}
