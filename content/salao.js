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

  curso: {
    nome: "Método Rica em Mesa",
    descricao:
      "Curso de fibra de vidro com a Luana, para quem quer aprender a técnica e o acabamento que fazem a diferença na mesa.",
  },

  // TODO: endereço real. Deixe "" para esconder.
  endereco: "",
  bairroCidade: "",

  // TODO: horários reais.
  horarios: [
    { dias: "Terça a sexta", horas: "9h às 19h" },
    { dias: "Sábado", horas: "9h às 15h" },
  ],

  // Serviços: preço "" mostra "Sob consulta".
  // manutencaoDias: de quantos em quantos dias a cliente deve voltar.
  servicos: [
    {
      nome: "Alongamento em fibra de vidro",
      descricao: "Unhas longas, finas e resistentes, com aparência natural.",
      preco: "",
      manutencaoDias: 25,
    },
    {
      nome: "Manutenção da fibra",
      descricao: "Preenchimento do crescimento e reforço da estrutura.",
      preco: "",
      manutencaoDias: 25,
    },
    {
      nome: "Esmaltação em gel",
      descricao: "Brilho e cor que duram semanas, direto na unha natural.",
      preco: "",
      manutencaoDias: 21,
    },
    {
      nome: "Manicure e pedicure",
      descricao: "Cutilagem, lixamento e esmaltação tradicional.",
      preco: "",
      manutencaoDias: null,
    },
    {
      nome: "Design de sobrancelhas",
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
