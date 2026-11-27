import { Cabecalho, Rodape } from "../../components/site/Moldura";
import FormContato from "./FormContato";
import { CONTATO, whatsVendas } from "../../lib/plataforma";

export const metadata = { title: "Contato", description: "Fale com a Tons Dellas pelo WhatsApp, e-mail ou formulário." };

const Ic = ({ children }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function Contato() {
  return (
    <div className="st">
      <Cabecalho />
      <main className="st-pagina">
        <div className="st-in">
          <h1>Fale com a gente</h1>
          <p className="st-texto">Tire dúvidas sobre os planos, peça uma demonstração ou conte como funciona o seu salão. Respondemos de segunda a sábado.</p>
          <div className="st-contato-grade">
            <div className="st-canais">
              <a className="st-canal" href={whatsVendas("Oi! Vim pelo site da Tons Dellas.")} target="_blank" rel="noopener">
                <Ic><path d="M4 18.5 5.3 15A7.5 7.5 0 1 1 9 18.6Z" /><path d="M8.5 11h7M8.5 14h4" /></Ic>
                <span><strong>WhatsApp</strong><span>{CONTATO.whatsappTexto}</span></span>
              </a>
              <a className="st-canal" href={`mailto:${CONTATO.email}`}>
                <Ic><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></Ic>
                <span><strong>E-mail</strong><span>{CONTATO.email}</span></span>
              </a>
              <div className="st-canal">
                <Ic><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></Ic>
                <span><strong>Onde estamos</strong><span>{CONTATO.cidade} · atendemos salões de todo o Brasil</span></span>
              </div>
            </div>
            <FormContato />
          </div>
        </div>
      </main>
      <Rodape />
    </div>
  );
}
