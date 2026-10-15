import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["//x"],
    ["/.//evil.com"],
    ["/a/..//evil.com"],
    ["/%2e//evil.com"],
    ["/\\x"],
    ["/\t/x"],
    ["/\n/x"],
    ["https://x"],
    ["javascript:alert(1)"],
    [""],
  ])("rifiuta %j", (v) => {
    expect(safeRedirectPath(v)).toBeNull();
  });

  it("rifiuta valori non stringa", () => {
    expect(safeRedirectPath(null)).toBeNull();
  });

  it.each([["/a?b=c"], ["/preventivi/nuovo?modalita=foto"]])("accetta %s", (v) => {
    expect(safeRedirectPath(v)).toBe(v);
  });
});
