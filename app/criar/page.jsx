import { rpcDoPedido } from "../../lib/empresaServidor";
import { cssPaleta } from "../../lib/paletas";
import CriarSalao from "./CriarSalao";

export const metadata = {
  title: "Crie o app do seu salão · Tons Dellas",
  description: "Agenda online com sinal por Pix, com a sua marca. 30 dias grátis, sem cartão.",
};

export default async function Criar() {
  const d = await rpcDoPedido("planos_publicos").catch(() => ({ planos: [], whatsapp: null }));
  return (
    <div className="app pl-pagina cs-pagina">
      <style dangerouslySetInnerHTML={{ __html: cssPaleta("cafe-ouro") }} />
      <header className="pl-topo">
        <a className="pl-marca" href="/planos">Tons Dellas</a>
        <a className="barra-link" href="/planos">Planos</a>
      </header>
      <CriarSalao planos={d.planos || []} whatsapp={d.whatsapp} />
    </div>
  );
}
