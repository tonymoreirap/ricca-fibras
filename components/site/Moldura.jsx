import Link from "next/link";
import { CONTATO, whatsVendas } from "../../lib/plataforma";

// Cabeçalho e rodapé do site de vendas (tonsdellas.com.br)
export function Cabecalho({ cta = true }) {
  return (
    <header className="st-cab">
      <div className="st-cab-in">
        <Link href="/" className="st-marca" aria-label="Tons Dellas, página inicial"><img src="/site/logo-tons-dellas-p.webp" alt="Tons Dellas" width="480" height="211" className="st-logo" /></Link>
        <nav className="st-nav" aria-label="Seções">
          <a href="/#recursos">Recursos</a>
          <a href="/#planos">Planos</a>
          <a href="/#duvidas">Dúvidas</a>
          <Link href="/contato">Contato</Link>
        </nav>
        {cta && <a className="st-botao st-botao-p" href="/#planos">Assinar</a>}
        <details className="st-menu">
          <summary aria-label="Abrir menu"><span /><span /><span /></summary>
          <div className="st-menu-caixa">
            <a href="/#como">Como funciona</a>
            <a href="/#recursos">Recursos</a>
            <a href="/#planos">Planos e preços</a>
            <a href="/#duvidas">Dúvidas</a>
            <Link href="/contato">Contato</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

export function Rodape() {
  return (
    <footer className="st-rodape">
      <div className="st-rodape-in">
        <div className="st-rodape-marca">
          <img src="/site/logo-tons-dellas-p.webp" alt="Tons Dellas" width="480" height="211" className="st-logo st-logo-rodape" />
          <p>O app de agendamento do seu salão, com a sua marca. Feito em {CONTATO.cidade}.</p>
        </div>
        <nav aria-label="Produto">
          <h2>Produto</h2>
          <a href="/#como">Como funciona</a>
          <a href="/#recursos">Recursos</a>
          <a href="/#planos">Planos e preços</a>
          <Link href="/criar">Criar o app do salão</Link>
        </nav>
        <nav aria-label="Empresa">
          <h2>Empresa</h2>
          <Link href="/contato">Contato</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Privacidade</Link>
        </nav>
        <div>
          <h2>Fale com a gente</h2>
          <a href={whatsVendas("Oi! Vim pelo site da Tons Dellas.")} target="_blank" rel="noopener">WhatsApp {CONTATO.whatsappTexto}</a>
          <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a>
          <span>Atendimento de segunda a sábado</span>
        </div>
      </div>
      <p className="st-rodape-fim">© {new Date().getFullYear()} Tons Dellas. Pagamentos processados pelo Mercado Pago.</p>
    </footer>
  );
}
