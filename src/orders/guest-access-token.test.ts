import { describe, expect, it } from "vitest";

import { createGuestOrderAccessToken } from "./guest-access-token";

describe("guest order access token module", () => {
  it("generates unguessable URL-safe guest order access tokens", () => {
    const firstToken = createGuestOrderAccessToken();
    const secondToken = createGuestOrderAccessToken();

    expect(firstToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(secondToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(firstToken).not.toBe(secondToken);
  });
});
