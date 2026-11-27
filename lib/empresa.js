// O salão do endereço acessado. Vem do banco (empresa_publica) e vira o objeto
// `salao` que as telas usam. content/salao.js fica só como reserva da Rica.
import { salao as RICA } from "../content/salao";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const ORDEM = [1, 2, 3, 4, 5, 6, 0];
const Mai = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const paraHoras = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return h + (m || 0) / 60;
};
export const formatarHora = (n) => {
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
};

function nomeDias(lista) {
  if (lista.length === 1) return Mai(DIAS[lista[0]]);
  const pos = lista.map((d) => ORDEM.indexOf(d));
  const seguidos = pos.every((p, i) => i === 0 || p === pos[i - 1] + 1);
  if (seguidos && lista.length > 2) return `${Mai(DIAS[lista[0]])} a ${DIAS[lista[lista.length - 1]]}`;
  return Mai(lista.slice(0, -1).map((d) => DIAS[d]).join(", ")) + " e " + DIAS[lista[lista.length - 1]];
}

// [{dia, abre:"09:00", fecha:"19:00"}] -> grupos para exibir e calcular agenda
export function gruposHorario(lista = []) {
  const por = new Map(lista.map((h) => [Number(h.dia), h]));
  const grupos = [];
  let atual = null;
  for (const d of ORDEM) {
    const h = por.get(d);
    if (!h) { atual = null; continue; }
    const chave = `${h.abre}-${h.fecha}`;
    if (atual && atual.chave === chave) atual.diasSemana.push(d);
    else {
      atual = { chave, diasSemana: [d], abre: paraHoras(h.abre), fecha: paraHoras(h.fecha) };
      grupos.push(atual);
    }
  }
  const fechados = ORDEM.filter((d) => !por.has(d));
  const saida = grupos.map((g) => ({
    dias: nomeDias(g.diasSemana),
    diasSemana: g.diasSemana,
    abre: g.abre,
    fecha: g.fecha,
    horas: `${formatarHora(g.abre)} às ${formatarHora(g.fecha)}`,
  }));
  if (fechados.length) {
    const ord = [0, ...fechados.filter((d) => d !== 0)].filter((d) => fechados.includes(d));
    saida.push({ dias: nomeDias(ord), diasSemana: fechados, horas: "Fechado" });
  }
  return saida;
}

const MODULOS_PADRAO = { agenda: true, curso: false, rede: false, promocoes: false, natal: true };

// empresa_publica() -> objeto no formato usado pelo app
export function montarSalao(e) {
  if (!e) return null;
  const c = e.config || {};
  const modulos = { ...MODULOS_PADRAO, ...(e.modulos || {}) };
  const contato = c.contato || e.nome;
  const rica = e.slug === "rica";
  return {
    id: e.id,
    slug: e.slug,
    dominio: e.dominio,
    ativa: e.ativa !== false,
    suspensa: Boolean(e.suspensa),
    estreia: Boolean(e.estreia),
    plano: e.plano || "essencial",
    recursos: e.recursos || ["agenda"],
    nome: e.nome,
    titulo: c.titulo || e.nome,
    frase: c.frase || "",
    ola: c.ola || "Olá, seja bem-vinda",
    descricaoSite: c.descricao_site || c.frase || `${e.nome}. Agende seu horário.`,
    whatsapp: c.whatsapp || "",
    contato,
    mensagemWhatsapp: c.mensagem_whatsapp || `Oi, ${contato}! Vim pelo app da ${e.nome} e quero agendar um horário.`,
    instagram: c.instagram || "",
    pix: { chave: "", exibicao: "", nome: e.nome.slice(0, 25), cidade: "Fortaleza", ...(c.pix || {}) },
    curso: { nome: "Curso de formação", descricao: "", chamada: "", topicos: [], carga_horaria: "", ...(c.curso || {}) },
    certificado: { assinatura: "", cargo: "", texto: "", ...(c.certificado || {}) },
    endereco: c.endereco || "",
    bairroCidade: c.bairro_cidade || "",
    horarios: gruposHorario(e.horarios),
    horariosBrutos: e.horarios || [],
    temas: modulos.natal ? RICA.temas : {},
    servicos: rica ? RICA.servicos : [],
    modulos,
    paleta: e.paleta || "cafe-ouro",
    cor: e.cor_principal || null,
    fotoCapa: e.foto_capa || null,
    logo: e.logo || null,
  };
}

// Reserva quando o banco não responde (só para a Rica)
export const SALAO_RICA = {
  ...RICA,
  id: null,
  slug: "rica",
  dominio: "ricafibras.tonsdellas.com.br",
  ativa: true,
  ola: "Olá, seja bem-vinda",
  descricaoSite: "Alongamento em fibra de vidro, esmaltação em gel, manicure e design de sobrancelhas. Agende seu horário.",
  horariosBrutos: [],
  modulos: { agenda: true, curso: true, rede: true, promocoes: false, natal: true },
  suspensa: false,
  plano: "salao",
  recursos: ["agenda", "push", "resumo", "promocoes", "cor_livre", "natal", "curso", "rede", "dominio", "sem_assinatura"],
  paleta: "cafe-ouro",
  cor: null,
  fotoCapa: "/rica-fundo.webp",
  logo: "/monograma.webp",
};

// O "salão" do site de vendas: só para componentes que esperam um salão
export const SALAO_PLATAFORMA = {
  ...SALAO_RICA,
  slug: "tonsdellas",
  dominio: "tonsdellas.com.br",
  nome: "Tons Dellas",
  titulo: "Tons Dellas",
  contato: "Tons Dellas",
  whatsapp: "5585997935916",
  instagram: "",
  servicos: [],
  temas: {},
  modulos: { agenda: false, curso: false, rede: false, promocoes: false, natal: false },
  fotoCapa: null,
  logo: null,
};

export const logoDe = (s) => s?.logo || null;
const LIGACOES = new Set(["de", "da", "do", "das", "dos", "e", "por", "com", "a", "o", "&"]);
export const iniciais = (nome = "") =>
  nome.trim().split(/\s+/).filter((p) => !LIGACOES.has(p.toLowerCase())).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || nome.charAt(0).toUpperCase() || "•";

export function linkAgendar(s, texto) {
  const t = texto || s.mensagemWhatsapp;
  if (s.whatsapp) return `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(t)}`;
  if (s.instagram) return `https://instagram.com/${s.instagram}`;
  return "/agendar";
}

export const mensagemServico = (s, nome) => `Oi, ${s.contato}! Vim pelo app da ${s.nome} e quero agendar: ${nome}.`;

export const canalAgendar = (s) => (s.whatsapp ? "WhatsApp" : s.instagram ? "Instagram" : "app");

export const linkWhats = (s, texto) =>
  s.whatsapp ? `https://wa.me/${s.whatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ""}` : null;

// "a Luana" quando há nome de contato; senão "o salão"
export const aContato = (s) => (s.contato && s.contato !== s.nome ? `a ${s.contato}` : "o salão");
export const AContato = (s) => Mai(aContato(s));
