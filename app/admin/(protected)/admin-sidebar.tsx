"use client";

import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  Store,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { logoutAdmin } from "../../../src/admin/actions";
import styles from "./admin.module.css";

type AdminSidebarProps = {
  username: string;
};

const ADMIN_SIDEBAR_MENU_ID = "admin-sidebar-menu";

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
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    icon: Settings
  }
] as const;

export function AdminSidebar({ username }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const ToggleIcon = isOpen ? X : Menu;

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <aside className={styles.sidebar} aria-label="Panel administrativo">
      <div className={styles.brandRow}>
        <Link
          className={styles.brand}
          href="/admin"
          aria-label="Irruptivo administración inicio"
          onClick={closeMenu}
        >
          <span className={styles.brandIcon}>
            <LayoutDashboard aria-hidden="true" size={19} strokeWidth={2.1} />
          </span>
          <span>IRRUPTIVO GESTIÓN</span>
        </Link>

        <button
          className={styles.mobileMenuButton}
          type="button"
          aria-controls={ADMIN_SIDEBAR_MENU_ID}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
        >
          <ToggleIcon aria-hidden="true" size={20} strokeWidth={2} />
        </button>

        <p className={styles.session}>
          <strong>Sesión activa</strong>
          {username}
        </p>
      </div>

      <div
        className={styles.sidebarMenu}
        data-open={isOpen}
        id={ADMIN_SIDEBAR_MENU_ID}
      >
        <nav className={styles.nav} aria-label="Navegación administrativa">
          {adminNavigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className={styles.navLink}
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link className={styles.storeLink} href="/" onClick={closeMenu}>
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
      </div>
    </aside>
  );
}
