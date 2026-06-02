import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Store
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAdmin } from "../../../src/admin/actions";
import { requireAdmin } from "../../../src/admin/auth";
import styles from "./admin.module.css";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

const adminNavigation = [
  {
    href: "/admin",
    label: "Inicio",
    icon: LayoutDashboard
  },
  {
    href: "/admin/productos",
    label: "Productos",
    icon: Package
  },
  {
    href: "/admin/pedidos",
    label: "Pedidos",
    icon: ClipboardList
  }
] as const;

export default async function ProtectedAdminLayout({
  children
}: ProtectedAdminLayoutProps) {
  const admin = await requireAdmin();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Panel administrativo">
        <div className={styles.brandRow}>
          <Link
            className={styles.brand}
            href="/admin"
            aria-label="Irruptivo administración inicio"
          >
            <span className={styles.brandIcon}>
              <LayoutDashboard aria-hidden="true" size={19} strokeWidth={2.1} />
            </span>
            <span>IRRUPTIVO GESTIÓN</span>
          </Link>

          <p className={styles.session}>
            <strong>Sesión activa</strong>
            {admin.username}
          </p>
        </div>

        <nav className={styles.nav} aria-label="Navegación administrativa">
          {adminNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link className={styles.navLink} href={item.href} key={item.href}>
                <Icon aria-hidden="true" size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link className={styles.storeLink} href="/">
            <Store aria-hidden="true" size={18} strokeWidth={2} />
            <span>Volver a la tienda</span>
          </Link>

          <form className={styles.logoutForm} action={logoutAdmin}>
            <button className={styles.logoutButton} type="submit">
              <LogOut aria-hidden="true" size={18} strokeWidth={2} />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
