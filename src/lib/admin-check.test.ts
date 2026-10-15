import { afterEach, describe, expect, it, vi } from "vitest";

import { isPlatformAdmin } from "./admin-check";

const CONFIRMED = "2026-01-01T00:00:00Z";

describe("isPlatformAdmin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("true se in lista e email confermata", () => {
    vi.stubEnv("IOP_ADMIN_EMAILS", "admin@iop.it");
    expect(isPlatformAdmin({ email: "admin@iop.it", email_confirmed_at: CONFIRMED })).toBe(true);
  });

  it("false se in lista ma email non confermata", () => {
    vi.stubEnv("IOP_ADMIN_EMAILS", "admin@iop.it");
    expect(isPlatformAdmin({ email: "admin@iop.it", email_confirmed_at: null })).toBe(false);
    expect(isPlatformAdmin({ email: "admin@iop.it" })).toBe(false);
  });

  it("false se non in lista", () => {
    vi.stubEnv("IOP_ADMIN_EMAILS", "admin@iop.it");
    expect(isPlatformAdmin({ email: "altro@iop.it", email_confirmed_at: CONFIRMED })).toBe(false);
  });

  it("match insensibile a maiuscole e spazi", () => {
    vi.stubEnv("IOP_ADMIN_EMAILS", " Admin@IOP.it , b@x.it ");
    expect(isPlatformAdmin({ email: "ADMIN@iop.it", email_confirmed_at: CONFIRMED })).toBe(true);
    expect(isPlatformAdmin({ email: "b@x.it", email_confirmed_at: CONFIRMED })).toBe(true);
  });

  it("false se env vuota o utente assente", () => {
    vi.stubEnv("IOP_ADMIN_EMAILS", "");
    expect(isPlatformAdmin({ email: "admin@iop.it", email_confirmed_at: CONFIRMED })).toBe(false);
    vi.stubEnv("IOP_ADMIN_EMAILS", "admin@iop.it");
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin({ email: null, email_confirmed_at: CONFIRMED })).toBe(false);
  });
});
