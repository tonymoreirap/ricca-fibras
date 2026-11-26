import { rpc } from "../../lib/supabase";
import { montarSalao } from "../../lib/empresa";
import { cssPaleta } from "../../lib/paletas";
import CentralGoogle from "./CentralGoogle";

export const metadata = { title: "Entrar com Google", robots: { index: false, follow: false } };

// O endereço de volta precisa ser de um salão cadastrado (o comprovante do
// Google só pode ir para um app nosso)
async function salaoDaVolta(volta) {
  let url;
  try {
    url = new URL(volta);
  } catch {
    return null;
  }
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost");
  if (url.protocol !== "https:" && !local) return null;
  const e = await rpc("empresa_publica", undefined, url.host.replace(/:\d+$/, "")).catch(() => null);
  return e ? { salao: montarSalao(e), origem: url.origin } : null;
}

export default async function Google({ searchParams }) {
  const q = await searchParams;
  const nonce = String(q.nonce || "").replace(/[^a-f0-9]/g, "").slice(0, 64);
  const alvo = await salaoDaVolta(String(q.volta || ""));
  const clientId = await rpc("google_ativo").catch(() => null);

  if (!alvo || !nonce || !clientId) {
    return (
      <main className="sem-salao">
        <h1>Não foi possível entrar</h1>
        <p>{!clientId ? "Entrar com Google ainda não está ativado." : "Volte ao app do salão e toque em “Continuar com Google” de novo."}</p>
      </main>
    );
  }
  const s = alvo.salao;
  return (
    <>
      {(s.paleta !== "cafe-ouro" || s.cor) && <style dangerouslySetInnerHTML={{ __html: cssPaleta(s.paleta, s.cor) }} />}
      <CentralGoogle clientId={clientId} nonce={nonce} volta={alvo.origem} nome={s.nome} logo={s.logo?.startsWith("/") ? alvo.origem + s.logo : s.logo} />
    </>
  );
}
