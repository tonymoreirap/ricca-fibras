import { diaSemana, instante } from "./formato";

export const STATUS = {
  aguardando_sinal: { texto: "Aguardando sinal", classe: "chip-alerta" },
  confirmado: { texto: "Confirmado", classe: "chip-ok" },
  concluido: { texto: "Concluído", classe: "" },
  cancelado: { texto: "Cancelado", classe: "chip-apagado" },
};

export function horarioDoDia(salao, iso) {
  return salao.horarios.find((h) => h.diasSemana.includes(diaSemana(iso)) && h.abre != null);
}

// Blocos fixos do tamanho do serviço a partir da abertura (ex.: 9h, 12h, 15h).
// ocupados: lista de [inicioMs, fimMs]; antecedenciaMin: minutos mínimos a partir de agora.
export function blocosDoDia(salao, iso, duracaoMin, ocupados = [], antecedenciaMin = 60) {
  const h = horarioDoDia(salao, iso);
  if (!h || !duracaoMin) return [];
  const limite = Date.now() + antecedenciaMin * 60000;
  const lista = [];
  for (let m = h.abre * 60; m + duracaoMin <= h.fecha * 60; m += duracaoMin) {
    const ini = instante(iso, 0).getTime() + m * 60000;
    const fim = ini + duracaoMin * 60000;
    if (ini < limite) continue;
    lista.push({ ini, fim, livre: !ocupados.some(([a, b]) => ini < b && fim > a) });
  }
  return lista;
}

export const paraIntervalos = (l) => l.map((o) => [new Date(o.inicio).getTime(), new Date(o.fim).getTime()]);

// Com equipe: cada intervalo leva a profissional ([ini, fim, id]). Sem id, bloqueia todas.
export const paraIntervalosEquipe = (l) =>
  l.map((o) => [new Date(o.inicio).getTime(), new Date(o.fim).getTime(), o.profissional || null]);

const daProfissional = (ocupados, id) => ocupados.filter((o) => !o[2] || o[2] === id);

// Horários livres de uma profissional, ou de qualquer uma da lista (basta uma estar livre)
export function blocosEquipe(salao, iso, duracaoMin, ocupados, ids = [], antecedenciaMin = 60) {
  if (!ids.length) return blocosDoDia(salao, iso, duracaoMin, ocupados, antecedenciaMin);
  const porProf = ids.map((id) => blocosDoDia(salao, iso, duracaoMin, daProfissional(ocupados, id), antecedenciaMin));
  return porProf[0].map((b, i) => ({ ...b, livres: porProf.filter((l) => l[i].livre).length, livre: porProf.some((l) => l[i].livre) }));
}

// Horários ocupados com a profissional; cai no formato antigo se o banco ainda não tiver equipe
export async function ocupadosDaEquipe(rpc, de, ate) {
  try {
    return paraIntervalosEquipe(await rpc("horarios_ocupados_equipe", { p_de: de, p_ate: ate }));
  } catch {
    return paraIntervalos(await rpc("horarios_ocupados", { p_de: de, p_ate: ate }));
  }
}

export const primeiroNome = (n = "") => n.trim().split(/\s+/)[0] || "";

export const NIVEL = {
  ouro: { texto: "Cliente Ouro", classe: "chip-ouro" },
  prata: { texto: "Cliente Prata", classe: "chip-prata" },
  nova: { texto: "Cliente da casa", classe: "" },
};

export const nivelDe = (nivel, salao) =>
  NIVEL[nivel] && nivel !== "nova" ? NIVEL[nivel] : { ...NIVEL.nova, texto: salao?.slug === "rica" ? "Cliente Rica" : NIVEL.nova.texto };

// Situação do pagamento de cada horário
export function pagamento(a, real) {
  const resto = Number(a.valor) - Number(a.sinal);
  if (a.status === "aguardando_sinal") return { texto: `Sinal de ${real(a.sinal)} pendente`, ok: false };
  if (a.status === "confirmado") return { texto: `Sinal de ${real(a.sinal)} pago · falta ${real(resto)} no dia`, ok: true };
  if (a.status === "concluido") return { texto: `Pago ${real(a.valor)}`, ok: true };
  return { texto: "Cancelado, sem cobrança", ok: null };
}
