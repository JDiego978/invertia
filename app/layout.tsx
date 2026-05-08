import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvertIA — Análisis de Inversiones con IA",
  description:
    "Análisis de inversiones con datos reales, modelos matemáticos verificados y motor de IA Claude. Acciones, cripto, ETFs, commodities y más.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen" style={{ background: "#0f172a" }}>
        {children}
      </body>
    </html>
  );
}
