import { describe, expect, it } from "vitest";

import {
  consumeDamageWindow,
  createDamageWindowLedger,
  retainDamageWindows,
} from "./damageWindowLedger";

describe("damage-window ledger", () => {
  it("does nothing before a collision", () => {
    const initial = createDamageWindowLedger();
    const result = consumeDamageWindow(initial, "ponto:a:1", false, false);

    expect(result.ledger).toBe(initial);
    expect(result.consumed).toBe(false);
    expect(result.shouldDamage).toBe(false);
  });

  it("allows at most one damage for one active-window key", () => {
    const first = consumeDamageWindow(createDamageWindowLedger(), "ponto:a:1", true, false);
    const second = consumeDamageWindow(first.ledger, "ponto:a:1", true, false);

    expect(first.consumed).toBe(true);
    expect(first.shouldDamage).toBe(true);
    expect(second.consumed).toBe(false);
    expect(second.shouldDamage).toBe(false);
  });

  it("consumes a protected collision so it cannot become delayed damage", () => {
    const protectedHit = consumeDamageWindow(
      createDamageWindowLedger(),
      "ponto:a:1",
      true,
      true,
    );
    const afterIframe = consumeDamageWindow(protectedHit.ledger, "ponto:a:1", true, false);

    expect(protectedHit.consumed).toBe(true);
    expect(protectedHit.shouldDamage).toBe(false);
    expect(afterIframe.consumed).toBe(false);
    expect(afterIframe.shouldDamage).toBe(false);
  });

  it("allows a new beat to damage independently", () => {
    const first = consumeDamageWindow(createDamageWindowLedger(), "ponto:a:1", true, false);
    const second = consumeDamageWindow(first.ledger, "ponto:a:2", true, false);

    expect(second.consumed).toBe(true);
    expect(second.shouldDamage).toBe(true);
  });

  it("ignores null keys outside active windows", () => {
    const initial = createDamageWindowLedger();
    const result = consumeDamageWindow(initial, null, true, false);

    expect(result.ledger).toBe(initial);
    expect(result.consumed).toBe(false);
    expect(result.shouldDamage).toBe(false);
  });

  it("drops consumed keys as soon as their attack window is no longer active", () => {
    const first = consumeDamageWindow(createDamageWindowLedger(), "ponto:a:1", true, false);
    const second = consumeDamageWindow(first.ledger, "ponto:b:1", true, false);
    const retained = retainDamageWindows(second.ledger, ["ponto:b:1"]);

    expect([...retained.consumedKeys]).toEqual(["ponto:b:1"]);
    expect(retainDamageWindows(retained, [])).toEqual(createDamageWindowLedger());
  });

  it("drops every consumed beat from an instance when the attack ends or is aborted", () => {
    let ledger = createDamageWindowLedger();
    for (const key of ["ponto:run-4:1", "ponto:run-4:2", "ponto:run-4:3"]) {
      ledger = consumeDamageWindow(ledger, key, true, false).ledger;
    }

    expect([...ledger.consumedKeys]).toEqual([
      "ponto:run-4:1",
      "ponto:run-4:2",
      "ponto:run-4:3",
    ]);
    expect(retainDamageWindows(ledger, [])).toEqual(createDamageWindowLedger());
  });
});
