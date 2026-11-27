import { rpcDoPedido } from "../../lib/empresaServidor";
import { cssPaleta } from "../../lib/paletas";
import CriarSalao from "./CriarSalao";
import { Cabecalho } from "../../components/site/Moldura";

export const metadata = {
  title: "Assinar e criar o app do seu salão",
  description: "Assine e crie em 2 minutos o app de agendamento do seu salão, com a sua marca.",
};

export default async function Criar() {
  const d = await rpcDoPedido("planos_publicos").catch(() => ({ planos: [], whatsapp: null }));
  return (
    <div className="st">
      <Cabecalho cta={false} />
      <div className="app pl-pagina cs-pagina">
        <style dangerouslySetInnerHTML={{ __html: cssPaleta("cafe-ouro") }} />
        <CriarSalao planos={d.planos || []} whatsapp={d.whatsapp} />
      </div>
    </div>
  );
}
