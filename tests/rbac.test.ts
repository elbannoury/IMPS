import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS, can, manageableRoles, permissionsForRole, ROLE_PERMISSIONS } from "@/lib/rbac";

describe("RBAC", () => {
  it("grants the owner every permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can("owner", permission)).toBe(true);
    }
  });

  it("prevents a collector from publishing or reviewing", () => {
    expect(can("collector", "property.write")).toBe(true);
    expect(can("collector", "property.publish")).toBe(false);
    expect(can("collector", "property.review")).toBe(false);
    expect(can("collector", "staff.manage")).toBe(false);
    expect(can("collector", "crm.read")).toBe(false);
  });

  it("lets a reviewer publish but not manage staff or settings", () => {
    expect(can("reviewer", "property.publish")).toBe(true);
    expect(can("reviewer", "property.review")).toBe(true);
    expect(can("reviewer", "staff.manage")).toBe(false);
    expect(can("reviewer", "settings.manage")).toBe(false);
  });

  it("keeps the analyst read-only", () => {
    const permissions = permissionsForRole("analyst");
    expect(permissions.every((permission) => permission.endsWith(".read") || permission === "report.read")).toBe(true);
    expect(can("analyst", "property.write")).toBe(false);
    expect(can("analyst", "crm.read")).toBe(false);
  });

  it("denies everything without a role", () => {
    for (const permission of ALL_PERMISSIONS) expect(can(null, permission)).toBe(false);
  });

  it("never lets a manager create or edit an owner, but an owner can", () => {
    expect(manageableRoles("manager")).not.toContain("owner");
    expect(manageableRoles("owner")).toContain("owner");
    expect(manageableRoles("collector")).toEqual([]);
  });

  it("does not give any role an unknown permission set", () => {
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        expect(ALL_PERMISSIONS).toContain(permission);
        expect(can(role, permission)).toBe(true);
      }
    }
  });
});
