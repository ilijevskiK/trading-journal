import { describe, it, expect, vi } from "vitest";
import { ensureUserSettingsRow, getOnboardingStatus } from "./userSettings";

function makePool(rows = []) {
  return { query: vi.fn().mockResolvedValue({ rows }) };
}

describe("ensureUserSettingsRow", () => {
  it("inserts a row with ON CONFLICT DO NOTHING, scoped to the user id", async () => {
    const pool = makePool();
    await ensureUserSettingsRow(pool, 42);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT"), [42]);
  });
});

describe("getOnboardingStatus", () => {
  it("returns the stored boolean when a row exists", async () => {
    const pool = makePool([{ onboarding_completed: true }]);
    await expect(getOnboardingStatus(pool, 42)).resolves.toBe(true);
  });

  it("returns false when no row exists", async () => {
    const pool = makePool([]);
    await expect(getOnboardingStatus(pool, 42)).resolves.toBe(false);
  });
});
