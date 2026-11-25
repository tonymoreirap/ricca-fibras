// Dados de exemplo da área da cliente. Some quando o login real estiver ligado ao banco.
// As datas são calculadas a partir de hoje.
export const clienteDemo = {
  nome: "Mariana",
  sobrenome: "Alves",
  clienteHaDias: 140,
  formato: "Amendoado",
  tecnica: "Fibra de vidro",
  selos: 7, // fidelidade (sugestão): a cada 10 manutenções
  ultimoServico: { nome: "Manutenção da fibra", diasAtras: 21, cicloDias: 25 },
  historico: [
    { nome: "Manutenção da fibra", icone: "manutencao", diasAtras: 21 },
    { nome: "Manutenção da fibra", icone: "manutencao", diasAtras: 47 },
    { nome: "Design de sobrancelhas", icone: "sobrancelha", diasAtras: 73 },
    { nome: "Alongamento em fibra de vidro", icone: "fibra", diasAtras: 73 },
  ],
};
