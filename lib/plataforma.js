// A plataforma Tons Dellas (site de vendas) mora no endereço principal.
// Cada salão mora no próprio endereço: nome.tonsdellas.com.br ou domínio próprio.

export const SITE = "https://tonsdellas.com.br";
export const ENDERECO_RICA = "https://ricafibras.tonsdellas.com.br";

export const CONTATO = {
  email: "tonymoreirap@gmail.com",
  whatsapp: "5585997935916",
  whatsappTexto: "(85) 99793-5916",
  cidade: "Fortaleza, CE",
};

const HOSTS = new Set(["tonsdellas.com.br", "www.tonsdellas.com.br", "tonsdellas.localhost"]);
export const ehPlataforma = (host) => HOSTS.has(String(host || "").toLowerCase().replace(/:\d+$/, ""));

// Páginas que existem no site de vendas; o resto é de salão
export const ROTAS_SITE = ["/", "/planos", "/criar", "/termos", "/contato", "/privacidade", "/google", "/mudou"];
export const ehRotaSite = (p) => ROTAS_SITE.some((r) => (r === "/" ? p === "/" : p === r || p.startsWith(`${r}/`)));

export const whatsVendas = (texto) => `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(texto)}`;
