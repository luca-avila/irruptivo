"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_SESSION_COOKIE,
  createAdminSessionForCredentials,
  isAdminAuthConfigured,
  readAdminAuthConfig
} from "./session";

const ADMIN_COOKIE_PATH = "/admin";

export async function loginAdmin(formData: FormData): Promise<void> {
  const username = readStringField(formData, "username");
  const password = readStringField(formData, "password");

  if (username.trim().length === 0 || password.length === 0) {
    redirect(`${ADMIN_LOGIN_PATH}?error=validacion`);
  }

  const config = readAdminAuthConfig();

  if (!isAdminAuthConfigured(config)) {
    redirect(`${ADMIN_LOGIN_PATH}?error=configuracion`);
  }

  const session = await createAdminSessionForCredentials(
    {
      username,
      password
    },
    config
  );

  if (!session) {
    redirect(`${ADMIN_LOGIN_PATH}?error=credenciales`);
  }

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    expires: session.expiresAt
  });

  redirect(ADMIN_HOME_PATH);
}

export async function logoutAdmin(_formData: FormData): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_COOKIE_PATH,
    maxAge: 0
  });

  redirect(`${ADMIN_LOGIN_PATH}?estado=sesion-cerrada`);
}

function readStringField(formData: FormData, name: string): string {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}
