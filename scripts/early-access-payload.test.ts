import { describe, expect, test } from "bun:test";
import { buildEarlyAccessPayload, EARLY_ACCESS_LIMITS } from "../src/lib/early-access";

describe("buildEarlyAccessPayload", () => {
  test("rejects submission without consent", () => {
    const result = buildEarlyAccessPayload({
      audience: "consumer",
      name: "Alex Rivera",
      email: "alex@example.com",
      consent: false,
    });
    expect(result.ok).toBe(false);
  });

  test("rejects names shorter than the database minimum after trimming", () => {
    const result = buildEarlyAccessPayload({
      audience: "consumer",
      name: "  A  ",
      email: "alex@example.com",
      consent: true,
    });
    expect(result.ok).toBe(false);
  });

  test("rejects names longer than the database maximum", () => {
    const result = buildEarlyAccessPayload({
      audience: "consumer",
      name: "A".repeat(EARLY_ACCESS_LIMITS.fullNameMax + 1),
      email: "alex@example.com",
      consent: true,
    });
    expect(result.ok).toBe(false);
  });

  test("trims inputs, clears organization for consumers, and truncates tracking parameters", () => {
    const longTracking = "x".repeat(250);
    const result = buildEarlyAccessPayload({
      audience: "consumer",
      name: "  Alex Rivera  ",
      email: "  alex@example.com  ",
      organization: "Should Be Omitted",
      city: "  London  ",
      interest: "   ",
      source: longTracking,
      referral: longTracking,
      campaign: longTracking,
      userId: "user-123",
      consent: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.payload).toEqual({
      audience: "consumer",
      full_name: "Alex Rivera",
      email: "alex@example.com",
      organization: null,
      city: "London",
      interest: null,
      source: "x".repeat(EARLY_ACCESS_LIMITS.trackingMax),
      referral: "x".repeat(EARLY_ACCESS_LIMITS.trackingMax),
      campaign: "x".repeat(EARLY_ACCESS_LIMITS.trackingMax),
      user_id: "user-123",
      consent: true,
    });
  });

  test("preserves trimmed organization for non-consumer audiences within limit", () => {
    const result = buildEarlyAccessPayload({
      audience: "business",
      name: "Sam Patel",
      email: "sam@studio.io",
      organization: "  Studio North  ",
      consent: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.organization).toBe("Studio North");
  });
});
