import "@fontsource/marcellus/400.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "./globals.css";
import RegistrarSW from "../components/RegistrarSW";

export const metadata = {
  metadataBase: new URL("https://tonsdellas.com.br"),
  title: "Ricca Fibras — alongamento em fibra de vidro",
  description:
    "Alongamento em fibra de vidro, esmaltação em gel, manicure e design de sobrancelhas. Agende seu horário.",
  appleWebApp: { capable: true, title: "Ricca Fibras", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "Ricca Fibras",
    description: "Fibra de vidro com acabamento de joia.",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/ricca-capa.webp", width: 720, height: 1279 }],
  },
};

export const viewport = {
  themeColor: "#1E1310",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
