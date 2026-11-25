import { dataDiaMes } from "./formato";

export const EXPERIENCIA = {
  nunca: "Nunca fiz unhas",
  iniciante: "Estou começando",
  ja_atendo: "Já atendo clientes",
};

export const STATUS_INSCRICAO = {
  nova: { texto: "Nova", classe: "chip-alerta" },
  contatada: { texto: "Contatada", classe: "" },
  matriculada: { texto: "Matriculada", classe: "chip-ok" },
  desistiu: { texto: "Desistiu", classe: "chip-apagado" },
};

export function periodoTurma(t) {
  if (!t.data_fim || t.data_fim === t.data_inicio) return dataDiaMes(t.data_inicio);
  const [a, b] = [t.data_inicio.slice(5, 7), t.data_fim.slice(5, 7)];
  if (a === b) return `${Number(t.data_inicio.slice(8, 10))} e ${dataDiaMes(t.data_fim)}`;
  return `${dataDiaMes(t.data_inicio)} a ${dataDiaMes(t.data_fim)}`;
}

export const instagramUrl = (u) => `https://instagram.com/${String(u).replace(/^@/, "")}`;
