// Datas sempre no horário de Fortaleza (UTC-3, sem horário de verão).
export const FUSO = "America/Fortaleza";
const OFFSET = "-03:00";

export const real = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const celularFormatado = (d) => {
  const n = String(d).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
};

export function mascaraCelular(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// "AAAA-MM-DD" de hoje em Fortaleza
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

export function somaDias(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const diaSemana = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

// Instante (Date) de um dia + hora em Fortaleza
export const instante = (iso, hora) => new Date(`${iso}T${String(hora).padStart(2, "0")}:00:00${OFFSET}`);

export const hora = (d) =>
  new Date(d).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

export const dataLonga = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });

export const dataCurta = (d) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
