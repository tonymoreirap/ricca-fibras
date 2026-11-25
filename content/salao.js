// Tudo o que aparece no site sai daqui. Edite este arquivo para trocar textos,
// serviços, contatos e horários — o layout se ajusta sozinho.

export const salao = {
  nome: "Rica Fibras",
  titulo: "Fibra de vidro com acabamento de joia.",
  frase:
    "Alongamento em fibra, manutenção no tempo certo e um atendimento pensado em cada detalhe.",

  // WhatsApp com DDI + DDD + número, só dígitos.
  whatsapp: "5585996447096",
  contato: "Luana",
  mensagemWhatsapp: "Oi, Luana! Vim pelo site da Rica Fibras e quero agendar um horário.",

  // Usuário do Instagram, sem o @.
  instagram: "ricafibra_unhas",

  // Temas de época: ligam e desligam sozinhos pela data de Fortaleza.
  // "anual" repete todo ano (mês-dia); "extra" cobre um período específico.
  temas: {
    natal: { anual: { inicio: "12-01", fim: "12-31" }, extra: [{ inicio: "2026-11-25", fim: "2026-12-31" }] },
  },

  // Pix do sinal: chave = celular da Luana
  pix: { chave: "+5585996447096", exibicao: "(85) 99644-7096", nome: "Rica Fibras", cidade: "Fortaleza" },

  curso: {
    nome: "Método Rica em Mesa",
    descricao:
      "Curso de fibra de vidro com a Luana, para quem quer aprender a técnica e o acabamento que fazem a diferença na mesa.",
  },

  // TODO: endereço real. Deixe "" para esconder.
  endereco: "",
  bairroCidade: "",

  // TODO: horários reais.
  // diasSemana: 0 = domingo ... 6 = sábado. abre/fecha em horas (24h).
  horarios: [
    { dias: "Terça a sexta", diasSemana: [2, 3, 4, 5], abre: 9, fecha: 19, horas: "9h às 19h" },
    { dias: "Sábado", diasSemana: [6], abre: 9, fecha: 15, horas: "9h às 15h" },
    { dias: "Domingo e segunda", diasSemana: [0, 1], horas: "Fechado" },
  ],

  // Serviços: preço "" mostra "Sob consulta".
  // manutencaoDias: de quantos em quantos dias a cliente deve voltar.
  servicos: [
    {
      nome: "Alongamento em fibra de vidro",
      icone: "fibra",
      descricao: "Unhas longas, finas e resistentes, com aparência natural.",
      preco: "R$ 190",
      agendaOnline: "aplicacao",
      manutencaoDias: 25,
    },
    {
      nome: "Manutenção da fibra",
      icone: "manutencao",
      descricao: "Preenchimento do crescimento e reforço da estrutura.",
      preco: "R$ 150",
      agendaOnline: "manutencao",
      manutencaoDias: 25,
    },
    {
      nome: "Esmaltação em gel",
      icone: "gel",
      descricao: "Brilho e cor que duram semanas, direto na unha natural.",
      preco: "",
      manutencaoDias: 21,
    },
    {
      nome: "Manicure e pedicure",
      icone: "manicure",
      descricao: "Cutilagem, lixamento e esmaltação tradicional.",
      preco: "",
      manutencaoDias: null,
    },
    {
      nome: "Design de sobrancelhas",
      icone: "sobrancelha",
      descricao: "Desenho feito para o seu rosto, com ou sem henna.",
      preco: "",
      manutencaoDias: 20,
    },
  ],
};

export function mensagemServico(nome) {
  return `Oi, Luana! Vim pelo site da Rica Fibras e quero agendar: ${nome}.`;
}

export function linkAgendar(texto = salao.mensagemWhatsapp) {
  return salao.whatsapp
    ? `https://wa.me/${salao.whatsapp}?text=${encodeURIComponent(texto)}`
    : `https://instagram.com/${salao.instagram}`;
}

export const canalAgendar = salao.whatsapp ? "WhatsApp" : "Instagram";
