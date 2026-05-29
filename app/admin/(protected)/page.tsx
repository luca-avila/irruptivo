import { ArrowRight, ClipboardList, Package } from "lucide-react";
import Link from "next/link";

import styles from "./admin.module.css";

const adminAreas = [
  {
    id: "productos",
    title: "Productos",
    copy: "Acceso preparado para la gestión de catálogo, variantes, stock e imágenes.",
    href: "/admin/productos",
    icon: Package
  },
  {
    id: "pedidos",
    title: "Pedidos",
    copy: "Acceso preparado para la cola operativa y el seguimiento de cumplimiento.",
    href: "/admin/pedidos",
    icon: ClipboardList
  }
] as const;

export default function AdminHomePage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Panel operativo</p>
        <h1 className={styles.title}>Administración</h1>
        <p className={styles.copy}>
          Este acceso ya está protegido para sumar las pantallas operativas de la
          tienda sin exponer gestión de productos ni pedidos públicamente.
        </p>
      </header>

      <section className={styles.grid} aria-label="Secciones administrativas">
        {adminAreas.map((area) => {
          const Icon = area.icon;

          return (
            <article className={styles.tile} id={area.id} key={area.id}>
              <div className={styles.tileHeader}>
                <h2>{area.title}</h2>
                <span className={styles.tileIcon}>
                  <Icon aria-hidden="true" size={21} strokeWidth={2} />
                </span>
              </div>
              <p>{area.copy}</p>
              <Link className={styles.actionLink} href={area.href}>
                <span>Abrir {area.title.toLowerCase()}</span>
                <ArrowRight aria-hidden="true" size={18} strokeWidth={2.1} />
              </Link>
            </article>
          );
        })}
      </section>
    </>
  );
}
