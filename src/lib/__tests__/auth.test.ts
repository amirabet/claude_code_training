// @vitest-environment node
import { vi, describe, test, expect, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets a cookie that expires in ~7 days", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expiresMs = (options.expires as Date).getTime();

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("stores a valid JWT with userId and email in the cookie", async () => {
    await createSession("user-42", "hello@test.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@test.com");
  });

  test("sets secure flag only in production", async () => {
    const original = process.env.NODE_ENV;

    // non-production
    (process.env as Record<string, string>).NODE_ENV = "test";
    await createSession("u", "u@u.com");
    const [, , optsDev] = mockCookieStore.set.mock.calls[0];
    expect(optsDev.secure).toBe(false);

    vi.clearAllMocks();

    // production
    (process.env as Record<string, string>).NODE_ENV = "production";
    await createSession("u", "u@u.com");
    const [, , optsProd] = mockCookieStore.set.mock.calls[0];
    expect(optsProd.secure).toBe(true);

    (process.env as Record<string, string>).NODE_ENV = original;
  });
});
