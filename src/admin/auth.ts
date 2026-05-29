import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE,
  type AdminIdentity,
  readAdminAuthConfig,
  verifyAdminSessionToken
} from "./session";

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSessionToken(token, readAdminAuthConfig());
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const admin = await verifyAdminSessionToken(token, readAdminAuthConfig());

  if (!admin) {
    redirect(
      `${ADMIN_LOGIN_PATH}?estado=${token ? "sesion-vencida" : "requerido"}`
    );
  }

  return admin;
}
