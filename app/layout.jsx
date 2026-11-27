import "@fontsource/marcellus/400.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "./globals.css";
import "./site.css";
import RegistrarSW from "../components/RegistrarSW";
import Gradientes from "../components/Gradientes";
import TemaSazonal from "../components/TemaSazonal";
import { EmpresaProvider } from "../components/Empresa";
import Bloqueio from "../components/Bloqueio";
import { empresaDoPedido, hostDoPedido, plataformaDoPedido } from "../lib/empresaServidor";
import { SALAO_PLATAFORMA } from "../lib/empresa";
import MigrarSessao from "../components/MigrarSessao";
import { cssPaleta, corDeFundo } from "../lib/paletas";

export async function generateMetadata() {
  const host = await hostDoPedido();
  const base = new URL(`https://${host && !host.includes("localhost") ? host : "tonsdellas.com.br"}`);
  if (await plataformaDoPedido()) {
    const descricao = "O app de agendamento do seu salão, com a sua marca: agenda online 24h, sinal por Pix, equipe, avisos e painel. Para manicures, estúdios e salões.";
    return {
      metadataBase: new URL("https://tonsdellas.com.br"),
      title: { default: "Tons Dellas · O app de agendamento do seu salão", template: "%s · Tons Dellas" },
      description: descricao,
      alternates: { canonical: "/" },
      icons: { icon: "/site/icone.png", apple: "/site/icone.png" },
      openGraph: { title: "Tons Dellas · O app do seu salão", description: descricao, locale: "pt_BR", type: "website", siteName: "Tons Dellas", images: [{ url: "/site/og.jpg", width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image" },
    };
  }
  const s = await empresaDoPedido();
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
  if (await plataformaDoPedido()) return { themeColor: "#1A100C", width: "device-width", initialScale: 1, viewportFit: "cover" };
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
  if (await plataformaDoPedido()) {
    return (
      <html lang="pt-BR">
        <body className="site">
          <EmpresaProvider salao={SALAO_PLATAFORMA}>
            <Gradientes />
            {children}
          </EmpresaProvider>
        </body>
      </html>
    );
  }
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
            <MigrarSessao />
            <Bloqueio>{children}</Bloqueio>
            <RegistrarSW />
          </EmpresaProvider>
        )}
      </body>
    </html>
  );
}
