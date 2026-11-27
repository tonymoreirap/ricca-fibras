// Mensagens prontas que a dona envia pelo WhatsApp da cliente
import { real, hora, dataLonga } from "./formato";
import { primeiroNome } from "./agenda";

export const whatsCliente = (cel, texto) => `https://wa.me/55${String(cel).replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

export const linkAcesso = (origem, celular, convite) =>
  `${origem}/entrar?nova=1&c=${String(celular).replace(/\D/g, "")}&convite=${convite}`;

export function msgBoasVindas(salao, c, convite, origem) {
  return [
    `Oi, ${primeiroNome(c.nome)}! Aqui é a ${salao.contato}, da ${salao.nome}.`,
    "Fiz o seu cadastro no nosso app. Por ele você acompanha seus horários, recibos e a data da próxima manutenção.",
    convite ? `Crie sua senha por este link: ${linkAcesso(origem, c.celular, convite)}` : `Entre por aqui: ${origem}/entrar`,
    `Para agendar quando quiser: ${origem}/agendar`,
    salao.instagram ? `Instagram: @${salao.instagram}` : null,
  ].filter(Boolean).join("\n\n");
}

export function msgConfirmacao(salao, a, convite, origem) {
  const pendente = a.status === "aguardando_sinal";
  return [
    `Oi, ${primeiroNome(a.cliente_nome)}! Seu horário na ${salao.nome} está marcado:`,
    `${a.servico_nome}${a.profissional_nome ? ` com ${a.profissional_nome}` : ""}\n${dataLonga(a.inicio)}, às ${hora(a.inicio)}\nValor: ${real(a.valor)}`,
    pendente
      ? `Para confirmar, envie o sinal de ${real(a.sinal)} via Pix.\nChave Pix: ${salao.pix.exibicao || salao.pix.chave}`
      : Number(a.sinal) > 0
        ? `Sinal de ${real(a.sinal)} recebido. No dia, o restante é ${real(a.valor - a.sinal)}.`
        : `Horário confirmado. O pagamento é feito no dia.`,
    salao.endereco ? `Endereço: ${salao.endereco}${salao.bairroCidade ? `, ${salao.bairroCidade}` : ""}` : null,
    `Seu recibo: ${origem}/recibo/${a.codigo}`,
    convite ? `Acompanhe tudo pelo app (crie sua senha): ${linkAcesso(origem, a.cliente_celular, convite)}` : null,
  ].filter(Boolean).join("\n\n");
}
