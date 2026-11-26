// Recursos dos planos: o que cada um libera e em qual plano começa.
export const RECURSOS = {
  agenda: { nome: "Agenda online com sinal por Pix", plano: "essencial" },
  push: { nome: "Avisos no celular e lembretes automáticos", plano: "profissional", texto: "Receba no celular cada reserva nova, cada Pix informado e o resumo da agenda, mesmo com o app fechado." },
  resumo: { nome: "Resumo do dia ao abrir o painel", plano: "profissional", texto: "Ao abrir o painel, um resumo do que pede atenção hoje: sinais, horários e manutenções." },
  promocoes: { nome: "Promoções com data e preço no agendamento", plano: "profissional", texto: "Crie ofertas que entram e saem do ar sozinhas, com o preço promocional já cobrado no agendamento." },
  cor_livre: { nome: "Cor livre da marca", plano: "profissional", texto: "Use a cor exata da sua marca no app inteiro, além das 8 paletas." },
  natal: { nome: "Tema de Natal e datas comemorativas", plano: "profissional", texto: "O app ganha enfeites nas datas especiais e volta ao normal sozinho." },
  curso: { nome: "Curso, turmas e inscrições", plano: "salao", texto: "Venda o seu curso pelo app: turmas, vagas, inscrições e lista de interessadas." },
  rede: { nome: "Rede de certificadas e certificados verificáveis", plano: "salao", texto: "Certificados em PDF com QR Code e uma vitrine das profissionais que você formou." },
  equipe3: { nome: "Equipe com até 3 profissionais", plano: "profissional", texto: "Cada profissional com a sua agenda. A cliente escolhe com quem agendar, ou deixa o salão escolher quem estiver livre." },
  equipe10: { nome: "Equipe com até 10 profissionais", plano: "salao", texto: "Até 10 agendas no mesmo app, cada uma com os serviços que a profissional faz. Precisa de mais? Some profissionais extras." },
  dominio: { nome: "Domínio próprio (nomedosalao.com.br)", plano: "salao" },
  sem_assinatura: { nome: "Sem a assinatura “Feito com Tons Dellas”", plano: "salao" },
};

export const NOME_PLANO = { essencial: "Essencial", profissional: "Profissional", salao: "Salão" };

export const SITE_PLATAFORMA = "https://tonsdellas.com.br";

export const temRecurso = (salao, r) => Boolean(salao?.recursos?.includes(r));

export const linkVendas = (whatsapp, texto) =>
  whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(texto)}` : `${SITE_PLATAFORMA}/planos`;

export const precoPlano = (n) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2 });
