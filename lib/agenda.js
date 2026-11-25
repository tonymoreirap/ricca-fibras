import { salao } from "../content/salao";
import { diaSemana, instante } from "./formato";

export const STATUS = {
  aguardando_sinal: { texto: "Aguardando sinal", classe: "chip-alerta" },
  confirmado: { texto: "Confirmado", classe: "chip-ok" },
  concluido: { texto: "Concluído", classe: "" },
  cancelado: { texto: "Cancelado", classe: "chip-apagado" },
};

export function horarioDoDia(iso) {
  return salao.horarios.find((h) => h.diasSemana.includes(diaSemana(iso)) && h.abre != null);
}

// Blocos fixos do tamanho do serviço a partir da abertura (ex.: 9h, 12h, 15h).
// ocupados: lista de [inicioMs, fimMs]; antecedenciaMin: minutos mínimos a partir de agora.
export function blocosDoDia(iso, duracaoMin, ocupados = [], antecedenciaMin = 60) {
  const h = horarioDoDia(iso);
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

export const primeiroNome = (n = "") => n.trim().split(/\s+/)[0] || "";
