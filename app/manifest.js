import { empresaDoPedido } from "../lib/empresaServidor";
import { corDeFundo } from "../lib/paletas";

// Ícone e nome do app instalado no celular, por salão
export default async function manifest() {
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
