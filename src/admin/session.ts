export const ADMIN_SESSION_COOKIE = "irruptivo_admin_session";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_SESSION_DURATION_SECONDS = 8 * 60 * 60;
export const ADMIN_SESSION_SECRET_MIN_LENGTH = 32;

export type AdminAuthConfig = {
  username?: string | null;
  password?: string | null;
  sessionSecret?: string | null;
  sessionDurationSeconds?: number | null;
};

export type AdminCredentials = {
  username: string;
  password: string;
};

export type AdminIdentity = {
  username: string;
};

export type AdminSession = {
  admin: AdminIdentity;
  token: string;
  expiresAt: Date;
};

export type AdminRouteAccess =
  | {
      kind: "public";
    }
  | {
      kind: "allowed";
      admin: AdminIdentity;
    }
  | {
      kind: "redirect";
      location: typeof ADMIN_LOGIN_PATH;
      reason: "required" | "expired";
    };

type AdminRouteAccessInput = {
  pathname: string;
  sessionToken?: string | null;
  config: AdminAuthConfig;
  now?: Date;
};

type AdminSessionPayload = {
  sub: string;
  iat: number;
  exp: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function readAdminAuthConfig(
  env: Record<string, string | undefined> = process.env
): AdminAuthConfig {
  return {
    username: env.ADMIN_USERNAME ?? env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    sessionSecret: env.ADMIN_SESSION_SECRET,
    sessionDurationSeconds: parsePositiveInteger(
      env.ADMIN_SESSION_DURATION_SECONDS
    )
  };
}

export function isAdminAuthConfigured(config: AdminAuthConfig): boolean {
  return (
    normalizeAdminUsername(config.username).length > 0 &&
    typeof config.password === "string" &&
    config.password.length > 0 &&
    typeof config.sessionSecret === "string" &&
    config.sessionSecret.length >= ADMIN_SESSION_SECRET_MIN_LENGTH
  );
}

export async function createAdminSessionForCredentials(
  credentials: AdminCredentials,
  config: AdminAuthConfig,
  now = new Date()
): Promise<AdminSession | null> {
  const admin = authenticateAdminCredentials(credentials, config);

  if (!admin) {
    return null;
  }

  const durationSeconds = getSessionDurationSeconds(config);
  const issuedAtSeconds = toUnixSeconds(now);
  const expiresAtSeconds = issuedAtSeconds + durationSeconds;
  const token = await createAdminSessionToken(
    {
      sub: admin.username,
      iat: issuedAtSeconds,
      exp: expiresAtSeconds
    },
    config
  );

  return {
    admin,
    token,
    expiresAt: new Date(expiresAtSeconds * 1000)
  };
}

export async function verifyAdminSessionToken(
  token: string | null | undefined,
  config: AdminAuthConfig,
  now = new Date()
): Promise<AdminIdentity | null> {
  if (!token || !isAdminAuthConfigured(config)) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(
    encodedPayload,
    config.sessionSecret ?? ""
  );

  if (!secureCompare(signature, expectedSignature)) {
    return null;
  }

  const payload = parseSessionPayload(encodedPayload);

  if (!payload) {
    return null;
  }

  if (payload.exp <= toUnixSeconds(now)) {
    return null;
  }

  const configuredUsername = normalizeAdminUsername(config.username);

  if (!secureCompare(payload.sub, configuredUsername)) {
    return null;
  }

  return {
    username: payload.sub
  };
}

export async function getAdminRouteAccess({
  pathname,
  sessionToken,
  config,
  now = new Date()
}: AdminRouteAccessInput): Promise<AdminRouteAccess> {
  if (!isAdminPath(pathname) || isAdminLoginPath(pathname)) {
    return {
      kind: "public"
    };
  }

  const admin = await verifyAdminSessionToken(sessionToken, config, now);

  if (admin) {
    return {
      kind: "allowed",
      admin
    };
  }

  return {
    kind: "redirect",
    location: ADMIN_LOGIN_PATH,
    reason: sessionToken ? "expired" : "required"
  };
}

function authenticateAdminCredentials(
  credentials: AdminCredentials,
  config: AdminAuthConfig
): AdminIdentity | null {
  if (!isAdminAuthConfigured(config)) {
    return null;
  }

  const expectedUsername = normalizeAdminUsername(config.username);
  const actualUsername = normalizeAdminUsername(credentials.username);
  const expectedPassword = config.password ?? "";
  const actualPassword = credentials.password;

  if (
    !secureCompare(actualUsername, expectedUsername) ||
    !secureCompare(actualPassword, expectedPassword)
  ) {
    return null;
  }

  return {
    username: expectedUsername
  };
}

async function createAdminSessionToken(
  payload: AdminSessionPayload,
  config: AdminAuthConfig
): Promise<string> {
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload));
  const signature = await signValue(encodedPayload, config.sessionSecret ?? "");

  return `${encodedPayload}.${signature}`;
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(value)
  );

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function parseSessionPayload(encodedPayload: string): AdminSessionPayload | null {
  try {
    const payload: unknown = JSON.parse(base64UrlDecodeText(encodedPayload));

    if (
      !isRecord(payload) ||
      typeof payload.sub !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp)
    ) {
      return null;
    }

    return {
      sub: normalizeAdminUsername(payload.sub),
      iat: payload.iat,
      exp: payload.exp
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`);
}

function isAdminLoginPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH || pathname === `${ADMIN_LOGIN_PATH}/`;
}

function getSessionDurationSeconds(config: AdminAuthConfig): number {
  if (
    typeof config.sessionDurationSeconds === "number" &&
    Number.isInteger(config.sessionDurationSeconds) &&
    config.sessionDurationSeconds > 0
  ) {
    return config.sessionDurationSeconds;
  }

  return ADMIN_SESSION_DURATION_SECONDS;
}

function normalizeAdminUsername(username: string | null | undefined): string {
  return (username ?? "").trim().toLowerCase();
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function secureCompare(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const leftCode = index < left.length ? left.charCodeAt(index) : 0;
    const rightCode = index < right.length ? right.charCodeAt(index) : 0;
    difference |= leftCode ^ rightCode;
  }

  return difference === 0;
}

function base64UrlEncodeText(value: string): string {
  return base64UrlEncodeBytes(textEncoder.encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeText(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return textDecoder.decode(bytes);
}
