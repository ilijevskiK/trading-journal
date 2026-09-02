import { describe, it, expect, vi } from "vitest";
import { isEmailAllowed } from "./allowlist";

function makePool(rows) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("isEmailAllowed", () => {
  it("returns true when the email is in allowed_emails", async () => {
    const pool = makePool([{ 1: 1 }]);
    await expect(isEmailAllowed(pool, "you@example.com")).resolves.toBe(true);
  });

  it("returns false when the email is not in allowed_emails", async () => {
    const pool = makePool([]);
    await expect(isEmailAllowed(pool, "stranger@example.com")).resolves.toBe(false);
  });

  it("normalizes case and whitespace before querying", async () => {
    const pool = makePool([{ 1: 1 }]);
    await isEmailAllowed(pool, "  You@Example.com  ");
    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ["you@example.com"]);
  });

  it("returns false without querying when email is missing", async () => {
    const pool = makePool([{ 1: 1 }]);
    await expect(isEmailAllowed(pool, "")).resolves.toBe(false);
    expect(pool.query).not.toHaveBeenCalled();
  });
});
