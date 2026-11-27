import { empresaDoPedido, plataformaDoPedido } from "../lib/empresaServidor";
import { corDeFundo } from "../lib/paletas";

// Ícone e nome do app instalado no celular, por salão
export default async function manifest() {
  if (await plataformaDoPedido()) {
    return {
      name: "Tons Dellas", short_name: "Tons Dellas", description: "O app de agendamento do seu salão.",
      start_url: "/", display: "standalone", background_color: "#1A100C", theme_color: "#1A100C", lang: "pt-BR",
      icons: [{ src: "/site/icone.png", sizes: "512x512", type: "image/png" }],
    };
  }
  const s = await empresaDoPedido();
  const nome = s?.nome || "Salão";
  const fundo = corDeFundo(s?.paleta);
  const proprio = s && s.slug !== "rica" && s.logo;
  return {
    name: nome,
    short_name: nome.length > 14 ? nome.split(" ")[0] : nome,
    description: s?.descricaoSite || "",
    start_url: "/",
    display: "standalone",
    background_color: fundo,
    theme_color: fundo,
    lang: "pt-BR",
    icons: proprio
      ? [
          { src: s.logo, sizes: "512x512", type: "image/png" },
          { src: s.logo, sizes: "192x192", type: "image/png" },
        ]
      : [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.webp", sizes: "512x512", type: "image/webp" },
          { src: "/icon-512.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
        ],
  };
}
