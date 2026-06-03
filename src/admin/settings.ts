import { prisma } from "../db/client";

export type StoreSettingsView = {
  adminNotificationEmail: string | null;
};

const STORE_SETTINGS_ID = "default";

export async function getStoreSettings(): Promise<StoreSettingsView> {
  const settings = await prisma.storeSettings.upsert({
    where: {
      id: STORE_SETTINGS_ID
    },
    update: {},
    create: {
      id: STORE_SETTINGS_ID
    }
  });

  return {
    adminNotificationEmail: settings.adminNotificationEmail
  };
}

export async function setAdminNotificationEmail(
  email: string | null
): Promise<StoreSettingsView> {
  const settings = await prisma.storeSettings.upsert({
    where: {
      id: STORE_SETTINGS_ID
    },
    update: {
      adminNotificationEmail: normalizeOptionalEmail(email)
    },
    create: {
      id: STORE_SETTINGS_ID,
      adminNotificationEmail: normalizeOptionalEmail(email)
    }
  });

  return {
    adminNotificationEmail: settings.adminNotificationEmail
  };
}

export async function getAdminNotificationRecipient(
  env: Record<string, string | undefined> = process.env
): Promise<string | null> {
  const settings = await getStoreSettings();

  return (
    normalizeOptionalEmail(settings.adminNotificationEmail) ??
    normalizeOptionalEmail(env.IRRUPTIVO_ADMIN_NOTIFICATION_EMAIL)
  );
}

function normalizeOptionalEmail(email: string | null | undefined): string | null {
  const trimmedEmail = email?.trim() ?? "";

  return trimmedEmail.length > 0 ? trimmedEmail : null;
}
