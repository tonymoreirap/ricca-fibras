import "@fontsource/marcellus/400.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "./globals.css";
import RegistrarSW from "../components/RegistrarSW";
import Gradientes from "../components/Gradientes";

export const metadata = {
  metadataBase: new URL("https://tonsdellas.com.br"),
  title: "Rica Fibras — alongamento em fibra de vidro",
  description:
    "Alongamento em fibra de vidro, esmaltação em gel, manicure e design de sobrancelhas. Agende seu horário.",
  appleWebApp: { capable: true, title: "Rica Fibras", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  openGraph: {
    title: "Rica Fibras",
    description: "Fibra de vidro com acabamento de joia.",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/rica-fundo.webp", width: 720, height: 1080 }],
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
        <Gradientes />
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
