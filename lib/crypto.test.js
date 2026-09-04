import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";
import { encrypt, decrypt } from "./crypto";

// Self-contained dummy key — doesn't depend on .env.local, so this test
// works the same in CI as it does locally.
process.env.SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString("base64");

describe("encrypt / decrypt", () => {
  it("round-trips a value", () => {
    const encrypted = encrypt("my-api-key");
    expect(encrypted).not.toBe("my-api-key");
    expect(decrypt(encrypted)).toBe("my-api-key");
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    expect(encrypt("same-value")).not.toBe(encrypt("same-value"));
  });

  it("returns null for a tampered/corrupted value instead of garbage", () => {
    const encrypted = encrypt("my-api-key");
    const tampered = encrypted.slice(0, -4) + "AAAA";
    expect(decrypt(tampered)).toBeNull();
  });

  it("passes legacy unprefixed plaintext through unchanged", () => {
    expect(decrypt("a-plaintext-key-from-before-this-existed")).toBe(
      "a-plaintext-key-from-before-this-existed"
    );
  });

  it("returns null for null/empty input on both directions", () => {
    expect(encrypt(null)).toBeNull();
    expect(encrypt("")).toBeNull();
    expect(decrypt(null)).toBeNull();
    expect(decrypt("")).toBeNull();
  });
});
