// Conteúdo do Método Rica em Mesa. RASCUNHO: confirme os tópicos com a Luana.
// Datas, vagas e valores NÃO ficam aqui: a Luana cadastra as turmas no painel.
export const curso = {
  nome: "Método Rica em Mesa",
  chamada: "Aprenda a fibra de vidro com acabamento de joia e saia com seu nome na rede de profissionais certificadas.",
  formatos: [
    { codigo: "turma", nome: "Turma", texto: "Aulas em grupo pequeno, com prática em modelo e acompanhamento da Luana." },
    { codigo: "vip", nome: "Individual (VIP)", texto: "Só você e a Luana, na data combinada, no seu ritmo." },
  ],
  topicos: [
    "Preparação da unha natural e biossegurança",
    "Aplicação da fibra de vidro passo a passo",
    "Estrutura, curvatura e ápice para unhas finas e resistentes",
    "Lixamento e acabamento de joia",
    "Manutenção: quando e como fazer",
    "Fotos para o Instagram e preço do seu serviço",
  ],
  // sequência real: do curso até a agenda com a sua marca
  caminho: [
    { titulo: "Curso", texto: "Teoria e prática com a Luana, em turma ou individual." },
    { titulo: "Certificado", texto: "Certificado com código e QR que qualquer cliente pode conferir online." },
    { titulo: "Rede Rica", texto: "Seu perfil na vitrine de profissionais certificadas, com sua cidade e seu Instagram." },
    { titulo: "Sua agenda", texto: "Interesse no app de agenda com Pix e lembretes, com a sua marca." },
  ],
  experiencias: [
    { codigo: "nunca", nome: "Nunca fiz unhas" },
    { codigo: "iniciante", nome: "Estou começando" },
    { codigo: "ja_atendo", nome: "Já atendo clientes" },
  ],
};

// Curso do salão do endereço. Chamada e tópicos vêm do "Meu salão"; sem
// nada preenchido, a Rica usa o texto acima e os outros salões, um texto neutro.
export function cursoDo(salao) {
  const rica = salao?.slug === "rica";
  const quem = salao?.contato || "a equipe";
  const troca = (t) => (rica ? t : t.replaceAll("Luana", quem).replaceAll("Rede Rica", "Rede de profissionais"));
  return {
    ...curso,
    nome: salao?.curso?.nome || curso.nome,
    chamada: salao?.curso?.chamada || (rica ? curso.chamada : salao?.curso?.descricao || "Aprenda com quem faz todos os dias e saia com certificado verificável."),
    cargaHoraria: salao?.curso?.carga_horaria || "",
    formatos: curso.formatos.map((f) => ({ ...f, texto: troca(f.texto) })),
    topicos: salao?.curso?.topicos?.length ? salao.curso.topicos : rica ? curso.topicos : [],
    caminho: curso.caminho.map((p) => ({ titulo: troca(p.titulo), texto: troca(p.texto) })),
  };
}
