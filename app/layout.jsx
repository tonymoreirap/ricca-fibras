import "@fontsource/marcellus/400.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "./globals.css";
import RegistrarSW from "../components/RegistrarSW";
import Gradientes from "../components/Gradientes";
import TemaSazonal from "../components/TemaSazonal";
import { EmpresaProvider } from "../components/Empresa";
import Bloqueio from "../components/Bloqueio";
import { empresaDoPedido, hostDoPedido } from "../lib/empresaServidor";
import { cssPaleta, corDeFundo } from "../lib/paletas";

export async function generateMetadata() {
  const s = await empresaDoPedido();
  const host = await hostDoPedido();
  const base = new URL(`https://${host && !host.startsWith("localhost") ? host : "tonsdellas.com.br"}`);
  if (!s) return { metadataBase: base, title: "Salão não encontrado" };
  const capa = s.fotoCapa || s.logo;
  return {
    metadataBase: base,
    title: s.slug === "rica" ? "Rica Fibras — alongamento em fibra de vidro" : s.nome,
    description: s.descricaoSite,
    appleWebApp: { capable: true, title: s.nome, statusBarStyle: "black-translucent" },
    icons: s.slug === "rica" || !s.logo ? { icon: "/icon-192.png", apple: "/icon-192.png" } : { icon: s.logo, apple: s.logo },
    openGraph: {
      title: s.nome,
      description: s.titulo,
      locale: "pt_BR",
      type: "website",
      ...(capa ? { images: [{ url: capa }] } : {}),
    },
  };
}

export async function generateViewport() {
  const s = await empresaDoPedido();
  return {
    themeColor: s ? corDeFundo(s.paleta) : "#1E1310",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

function SemSalao({ titulo, texto }) {
  return (
    <main className="sem-salao">
      <h1>{titulo}</h1>
      <p>{texto}</p>
    </main>
  );
}

export default async function RootLayout({ children }) {
  const s = await empresaDoPedido();
  const paleta = s && (s.paleta !== "cafe-ouro" || s.cor) ? cssPaleta(s.paleta, s.cor) : null;
  return (
    <html lang="pt-BR">
      <head>{paleta && <style id="paleta" dangerouslySetInnerHTML={{ __html: paleta }} />}</head>
      <body className={s ? `marca-${s.slug}` : undefined}>
        {!s ? (
          <SemSalao titulo="Salão não encontrado" texto="Confira o endereço que você recebeu. Se o link estiver certo, fale com o salão." />
        ) : (
          <EmpresaProvider salao={s}>
            <Gradientes />
            <TemaSazonal />
            <Bloqueio>{children}</Bloqueio>
            <RegistrarSW />
          </EmpresaProvider>
        )}
      </body>
    </html>
  );
}
