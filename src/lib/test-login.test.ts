import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isTestLoginEnabled, verifyTestLoginSecret } from "@/lib/test-login";

const ORIGINAL = process.env.TEST_LOGIN_SECRET;

afterEach(() => {
  process.env.TEST_LOGIN_SECRET = ORIGINAL;
});

describe("verifyTestLoginSecret", () => {
  beforeEach(() => {
    process.env.TEST_LOGIN_SECRET = "correct-horse-battery-staple";
  });

  it("accepts the exact secret", () => {
    expect(verifyTestLoginSecret("correct-horse-battery-staple")).toBe(true);
  });

  it("rejects a wrong secret, including a same-length near-miss", () => {
    expect(verifyTestLoginSecret("correct-horse-battery-staplf")).toBe(false);
    expect(verifyTestLoginSecret("wrong")).toBe(false);
    expect(verifyTestLoginSecret("")).toBe(false);
  });

  it("rejects non-string input without throwing", () => {
    expect(verifyTestLoginSecret(null)).toBe(false);
    expect(verifyTestLoginSecret(undefined)).toBe(false);
  });

  it("always rejects once the env var is unset, even an empty guess", () => {
    delete process.env.TEST_LOGIN_SECRET;
    expect(isTestLoginEnabled()).toBe(false);
    expect(verifyTestLoginSecret("")).toBe(false);
    expect(verifyTestLoginSecret("correct-horse-battery-staple")).toBe(false);
  });
});
