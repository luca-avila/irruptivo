import { describe, expect, it } from "vitest";

import {
  ADMIN_LOGIN_PATH,
  createAdminSessionForCredentials,
  getAdminRouteAccess,
  verifyAdminSessionToken,
  type AdminAuthConfig
} from "./session";

const config = {
  username: "admin@irruptivo.test",
  password: "correct-password",
  sessionSecret: "test-secret-with-at-least-thirty-two-characters",
  sessionDurationSeconds: 60
} satisfies AdminAuthConfig;

const issuedAt = new Date("2026-05-29T12:00:00.000Z");

describe("admin session boundary", () => {
  it("does not create an admin session for invalid credentials", async () => {
    await expect(
      createAdminSessionForCredentials(
        {
          username: "admin@irruptivo.test",
          password: "wrong-password"
        },
        config,
        issuedAt
      )
    ).resolves.toBeNull();
  });

  it("redirects protected admin routes when no session is present", async () => {
    await expect(
      getAdminRouteAccess({
        pathname: "/admin",
        sessionToken: undefined,
        config,
        now: issuedAt
      })
    ).resolves.toEqual({
      kind: "redirect",
      location: ADMIN_LOGIN_PATH,
      reason: "required"
    });
  });

  it("allows a valid admin session to access the protected shell", async () => {
    const session = await createAdminSessionForCredentials(
      {
        username: "ADMIN@IRRUPTIVO.TEST",
        password: "correct-password"
      },
      config,
      issuedAt
    );

    expect(session).not.toBeNull();

    await expect(
      getAdminRouteAccess({
        pathname: "/admin/productos",
        sessionToken: session?.token,
        config,
        now: issuedAt
      })
    ).resolves.toEqual({
      kind: "allowed",
      admin: {
        username: "admin@irruptivo.test"
      }
    });
  });

  it("rejects expired admin sessions", async () => {
    const session = await createAdminSessionForCredentials(
      {
        username: "admin@irruptivo.test",
        password: "correct-password"
      },
      config,
      issuedAt
    );

    expect(session).not.toBeNull();

    const expiredAt = new Date("2026-05-29T12:01:01.000Z");

    await expect(
      verifyAdminSessionToken(session?.token, config, expiredAt)
    ).resolves.toBeNull();

    await expect(
      getAdminRouteAccess({
        pathname: "/admin/pedidos",
        sessionToken: session?.token,
        config,
        now: expiredAt
      })
    ).resolves.toEqual({
      kind: "redirect",
      location: ADMIN_LOGIN_PATH,
      reason: "expired"
    });
  });

  it("does not require login for public customer routes or the admin login route", async () => {
    await expect(
      getAdminRouteAccess({
        pathname: "/coleccion",
        sessionToken: undefined,
        config,
        now: issuedAt
      })
    ).resolves.toEqual({ kind: "public" });

    await expect(
      getAdminRouteAccess({
        pathname: "/admin/login",
        sessionToken: undefined,
        config,
        now: issuedAt
      })
    ).resolves.toEqual({ kind: "public" });
  });
});
