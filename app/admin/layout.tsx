import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Administración | Irruptivo",
  description: "Panel administrativo protegido de Irruptivo."
};

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <style>{`
        .storefront-header {
          display: none;
        }

        .site-main {
          min-height: 100svh;
          background: #f3f1ec;
        }
      `}</style>
      {children}
    </>
  );
}
