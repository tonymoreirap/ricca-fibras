// Painel de resultados: nomes, contas e alertas
import { real } from "./formato";

export const TIPOS_DESPESA = {
  aluguel: "Aluguel",
  material: "Material de trabalho",
  produtos: "Produtos",
  contas: "Água, luz e internet",
  salarios: "Salários e ajudantes",
  marketing: "Divulgação",
  impostos: "Impostos e taxas",
  equipamentos: "Equipamentos",
  curso: "Curso (material e local)",
  outros: "Outros",
};

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const nomeMes = (iso) => {
  const [a, m] = String(iso).split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
};
export const mesCurto = (iso) => MESES[Number(String(iso).split("-")[1]) - 1].slice(0, 3);
export const mudarMes = (iso, n) => {
  const [a, m] = String(iso).split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
};
export const pct = (parte, todo) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);

// Alertas: o que olhar primeiro para ganhar mais e perder menos
export function montarAlertasResultado(r) {
  const l = [];
  const n = (v) => Number(v || 0);
  const anterior = r.serie?.[r.serie.length - 2];
  const perdas = r.perdas || {};
  const oc = r.ocupacao || {};
  const cl = r.clientes || {};

  if (n(perdas.atrasados_sem_concluir) > 0) {
    l.push({ id: "concluir", nivel: "urgente", acao: "concluir",
      titulo: `${perdas.atrasados_sem_concluir} ${perdas.atrasados_sem_concluir === 1 ? "atendimento já passou" : "atendimentos já passaram"} e não ${perdas.atrasados_sem_concluir === 1 ? "foi concluído" : "foram concluídos"}`,
      texto: "O que não é concluído não entra no faturamento. Marque como concluído para os números ficarem certos." });
  }
  if (n(r.despesas) === 0) {
    l.push({ id: "sem-despesas", nivel: "atencao", acao: "despesa",
      titulo: "Lance as despesas do mês",
      texto: "Sem aluguel, material e contas, o painel mostra só o que entrou, não o lucro de verdade." });
  }
  if (n(r.despesas) > 0 && n(r.lucro) < 0) {
    l.push({ id: "prejuizo", nivel: "urgente",
      titulo: r.mes_atual ? `Faltam ${real(-n(r.lucro))} para cobrir as despesas do mês` : `O mês fechou com prejuízo de ${real(-n(r.lucro))}`,
      texto: n(r.a_receber) > 0 && r.mes_atual
        ? `Ainda há ${real(r.a_receber)} em horários marcados. Se todos vierem, o mês fecha ${n(r.lucro) + n(r.a_receber) >= 0 ? "no azul" : "ainda no vermelho"}.`
        : "Veja abaixo onde dá para cortar gastos ou encher a agenda." });
  }
  if (r.mes_atual && anterior && n(anterior.faturado) > 0) {
    const projecao = n(r.faturado) + n(r.a_receber);
    if (projecao < n(anterior.faturado) * 0.8) {
      l.push({ id: "queda", nivel: "atencao",
        titulo: "O mês está abaixo do anterior",
        texto: `Entre o que já entrou e o que está marcado são ${real(projecao)}. No mês passado foram ${real(anterior.faturado)}.` });
    }
  }
  if (anterior && n(anterior.despesas) > 0 && n(r.despesas) > n(anterior.despesas) * 1.2) {
    l.push({ id: "despesa-subiu", nivel: "atencao",
      titulo: `As despesas subiram ${pct(n(r.despesas) - n(anterior.despesas), n(anterior.despesas))}%`,
      texto: `${real(r.despesas)} neste mês contra ${real(anterior.despesas)} no anterior.` });
  }
  if (oc.pct != null && n(oc.capacidade_horas) >= 20 && oc.pct < 50) {
    const vazias = n(oc.capacidade_horas) - n(oc.ocupadas_horas);
    l.push({ id: "ocupacao", nivel: oc.pct < 30 ? "urgente" : "atencao",
      titulo: `Sua agenda está só ${oc.pct}% ocupada`,
      texto: `${vazias} horas livres até agora${n(oc.valor_hora) > 0 ? `, o que poderia render cerca de ${real(vazias * n(oc.valor_hora))}` : ""}. Uma promoção nos dias fracos ou chamar as clientes sumidas ajuda.` });
  }
  const totalHorarios = n(r.atendimentos) + n(perdas.cancelados);
  if (totalHorarios >= 6 && pct(n(perdas.cancelados), totalHorarios) >= 15) {
    const motivo = perdas.motivos?.[0]?.motivo;
    l.push({ id: "cancelamentos", nivel: "atencao",
      titulo: `${pct(n(perdas.cancelados), totalHorarios)}% dos horários foram cancelados`,
      texto: `${real(perdas.cancelados_valor)} que não entraram.${motivo ? ` Motivo mais comum: “${motivo}”.` : ""} Cobrar sinal ou lembrar a cliente na véspera reduz isso.` });
  }
  if (cl.sumidas?.length > 0) {
    const valor = cl.sumidas.reduce((s, c) => s + n(c.total), 0);
    l.push({ id: "sumidas", nivel: "atencao", acao: "sumidas",
      titulo: `${cl.sumidas.length} ${cl.sumidas.length === 1 ? "cliente boa não volta" : "clientes boas não voltam"} há mais de 2 meses`,
      texto: `Juntas já gastaram ${real(valor)} no salão. Uma mensagem com um convite costuma trazer de volta.` });
  }
  if (n(r.faturado) > 0 && n(r.comissoes) > n(r.faturado) * 0.5) {
    l.push({ id: "comissao", nivel: "atencao",
      titulo: `As comissões levam ${pct(n(r.comissoes), n(r.faturado))}% do faturamento`,
      texto: "Sobra pouco para pagar as despesas do salão. Vale rever as porcentagens ou os preços." });
  }
  if (n(r.faturado) > 0 && n(perdas.descontos) > n(r.faturado) * 0.1) {
    l.push({ id: "descontos", nivel: "info",
      titulo: `As promoções custaram ${real(perdas.descontos)}`,
      texto: `Isso é ${pct(n(perdas.descontos), n(r.faturado))}% do faturamento. Veja se trouxeram clientes novas.` });
  }
  if (n(r.visitas) >= 30 && pct(n(cl.reservas_app), n(r.visitas)) < 5) {
    l.push({ id: "conversao", nivel: "info",
      titulo: `${r.visitas} pessoas visitaram o app e só ${cl.reservas_app} reservaram`,
      texto: "Fotos dos trabalhos, preços claros e horários livres na semana ajudam a converter." });
  }
  const dias = (r.por_dia_semana || []).filter((d) => n(d.qtd) > 0);
  if (dias.length >= 3) {
    const fraco = [...dias].sort((a, b) => n(a.valor) - n(b.valor))[0];
    const forte = [...dias].sort((a, b) => n(b.valor) - n(a.valor))[0];
    if (n(forte.valor) > n(fraco.valor) * 2) {
      l.push({ id: "dia-fraco", nivel: "info",
        titulo: `${DIAS_SEMANA[fraco.dia]} é o dia mais fraco`,
        texto: `Rende ${real(fraco.valor)}, contra ${real(forte.valor)} de ${DIAS_SEMANA[forte.dia].toLowerCase()}. Uma promoção nesse dia pode equilibrar.` });
    }
  }
  if (n(perdas.sinais_pendentes) > 0) {
    l.push({ id: "sinais", nivel: "info",
      titulo: `${real(perdas.sinais_pendentes_valor)} em sinais ainda não pagos`,
      texto: `${perdas.sinais_pendentes} ${perdas.sinais_pendentes === 1 ? "horário segura" : "horários seguram"} a agenda sem pagamento. Cobre pelo WhatsApp na aba Sinais.` });
  }
  if (n(r.cursos?.sem_resposta) > 0) {
    l.push({ id: "curso", nivel: "atencao", href: "/admin/curso",
      titulo: `${r.cursos.sem_resposta} ${r.cursos.sem_resposta === 1 ? "interessada" : "interessadas"} no curso sem resposta`,
      texto: "Quem responde rápido matricula mais. Toque para chamar no WhatsApp." });
  }
  if (anterior && n(r.despesas) > 0 && n(r.lucro) > 0 && n(anterior.lucro) > 0 && n(r.lucro) > n(anterior.lucro)) {
    l.push({ id: "bom", nivel: "ok",
      titulo: `Lucro ${pct(n(r.lucro) - n(anterior.lucro), n(anterior.lucro))}% maior que no mês passado`,
      texto: "Continue assim." });
  }
  const peso = { urgente: 0, atencao: 1, info: 2, ok: 3 };
  return l.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
