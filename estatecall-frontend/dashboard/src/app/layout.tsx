import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "EstateCall · Panel del agente",
  description: "Panel del agente inmobiliario con IA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        {/* Proveedor de auth: envuelve toda la app para compartir el token */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
