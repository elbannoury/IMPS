import { describe, expect, it } from "vitest";
import { canTransition, PUBLIC_STATUSES } from "@/lib/status";

describe("property lifecycle", () => {
  it("follows draft → in_review → published", () => {
    expect(canTransition("draft", "in_review")).toBe(true);
    expect(canTransition("in_review", "published")).toBe(true);
  });

  it("refuses to publish a draft directly", () => {
    expect(canTransition("draft", "published")).toBe(false);
  });

  it("allows transaction outcomes from published", () => {
    for (const status of ["reserved", "sold", "rented", "unavailable", "expired", "archived"] as const) {
      expect(canTransition("published", status)).toBe(true);
    }
  });

  it("keeps archived listings out of the available set", () => {
    expect(PUBLIC_STATUSES).not.toContain("archived");
    expect(PUBLIC_STATUSES).not.toContain("draft");
    expect(PUBLIC_STATUSES).not.toContain("in_review");
  });
});
