export default function manifest() {
  return {
    name: "Ricca Fibras",
    short_name: "Ricca Fibras",
    description: "Alongamento em fibra de vidro e cuidados que duram.",
    start_url: "/",
    display: "standalone",
    background_color: "#1E1310",
    theme_color: "#1E1310",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.webp", sizes: "512x512", type: "image/webp" },
      { src: "/icon-512.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
    ],
  };
}
