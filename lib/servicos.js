// Catálogo de serviços: vem do banco (editável no painel). O conteúdo fixo é só reserva se o banco não responder.
import { rpc } from "./supabase";
import { salao } from "../content/salao";

export function precoServico(valor) {
  if (valor === null || valor === undefined || valor === "") return "Consulte";
  const n = Number(valor);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

export const linhaServico = (s) => s.resumo || (s.ciclo_dias ? `Manutenção a cada ${s.ciclo_dias} dias` : "");

const reserva = () =>
  salao.servicos.map((s, i) => ({
    codigo: s.agendaOnline || s.icone,
    nome: s.nome,
    descricao: s.descricao,
    resumo: s.manutencaoDias ? null : "Cuidado completo",
    icone: s.icone,
    valor: s.preco ? Number(s.preco.replace(/\D/g, "")) : null,
    ciclo_dias: s.manutencaoDias,
    destaque: i === 0,
    selo: i === 0 ? "Assinatura da casa" : null,
    agenda_online: Boolean(s.agendaOnline),
  }));

export async function carregarCatalogo() {
  try {
    const lista = await rpc("servicos_catalogo");
    return Array.isArray(lista) ? lista : reserva();
  } catch {
    return reserva();
  }
}
