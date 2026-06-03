import { describe, expect, it } from "vitest";

import { parseAdminNotificationEmailForm } from "./settings-validation";

describe("admin settings actions", () => {
  it("accepts a valid admin notification email", () => {
    expect(
      parseAdminNotificationEmailForm(
        createFormData("adminNotificationEmail", " ventas@irruptivo.com ")
      )
    ).toEqual({
      status: "valid",
      email: "ventas@irruptivo.com"
    });
  });

  it("allows clearing the admin notification email", () => {
    expect(
      parseAdminNotificationEmailForm(
        createFormData("adminNotificationEmail", "   ")
      )
    ).toEqual({
      status: "valid",
      email: null
    });
  });

  it("rejects invalid email values with es-AR copy", () => {
    expect(
      parseAdminNotificationEmailForm(
        createFormData("adminNotificationEmail", "no-es-email")
      )
    ).toEqual({
      status: "invalid",
      message: "Ingresá un email válido o dejá el campo vacío."
    });
  });
});

function createFormData(name: string, value: string): FormData {
  const formData = new FormData();
  formData.set(name, value);

  return formData;
}
