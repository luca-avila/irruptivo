import type { Metadata } from "next";
import type { ReactNode } from "react";

import { StorefrontHeader } from "../src/storefront/components/storefront-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Irruptivo",
  description: "Tienda pública de Irruptivo."
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es-AR">
      <body>
        <StorefrontHeader />
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
