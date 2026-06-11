import type { ReactNode } from "react";

import { requireAdmin } from "../../../src/admin/auth";
import { AdminSidebar } from "./admin-sidebar";
import styles from "./admin.module.css";

type ProtectedAdminLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedAdminLayout({
  children
}: ProtectedAdminLayoutProps) {
  const admin = await requireAdmin();

  return (
    <div className={styles.shell}>
      <AdminSidebar username={admin.username} />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
