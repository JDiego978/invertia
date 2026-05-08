export const PAISES = [
  { codigo: "CO", nombre: "Colombia", moneda: "COP", bandera: "🇨🇴", simbolo: "$" },
  { codigo: "MX", nombre: "México", moneda: "MXN", bandera: "🇲🇽", simbolo: "$" },
  { codigo: "AR", nombre: "Argentina", moneda: "ARS", bandera: "🇦🇷", simbolo: "$" },
  { codigo: "CL", nombre: "Chile", moneda: "CLP", bandera: "🇨🇱", simbolo: "$" },
  { codigo: "PE", nombre: "Perú", moneda: "PEN", bandera: "🇵🇪", simbolo: "S/" },
  { codigo: "BR", nombre: "Brasil", moneda: "BRL", bandera: "🇧🇷", simbolo: "R$" },
  { codigo: "PA", nombre: "Panamá", moneda: "USD", bandera: "🇵🇦", simbolo: "$" },
  { codigo: "UY", nombre: "Uruguay", moneda: "UYU", bandera: "🇺🇾", simbolo: "$U" },
  { codigo: "VE", nombre: "Venezuela", moneda: "USD", bandera: "🇻🇪", simbolo: "$" },
  { codigo: "ES", nombre: "España", moneda: "EUR", bandera: "🇪🇸", simbolo: "€" },
  { codigo: "GB", nombre: "Reino Unido", moneda: "GBP", bandera: "🇬🇧", simbolo: "£" },
  { codigo: "US", nombre: "Estados Unidos", moneda: "USD", bandera: "🇺🇸", simbolo: "$" },
  { codigo: "CA", nombre: "Canadá", moneda: "CAD", bandera: "🇨🇦", simbolo: "$" },
];

export function getPais(codigo: string) {
  return PAISES.find((p) => p.codigo === codigo) ?? PAISES[0];
}

export function formatMonto(monto: number, moneda: string): string {
  const locale = moneda === "EUR" ? "es-ES" : "es-CO";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto);
}

export function formatUSD(monto: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(monto);
}
