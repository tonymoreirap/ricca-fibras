// Dados de exemplo da área da cliente. Some quando o login real estiver ligado ao banco.
export const clienteDemo = {
  nome: "Mariana",
  formato: "Amendoado",
  tecnica: "Fibra de vidro",
  // dias desde o último atendimento (as datas são calculadas a partir de hoje)
  ultimoServico: { nome: "Manutenção da fibra", diasAtras: 21, cicloDias: 25 },
  historico: [
    { nome: "Manutenção da fibra", diasAtras: 21 },
    { nome: "Manutenção da fibra", diasAtras: 47 },
    { nome: "Alongamento em fibra de vidro", diasAtras: 73 },
    { nome: "Design de sobrancelhas", diasAtras: 73 },
  ],
};
