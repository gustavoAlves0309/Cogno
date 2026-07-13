import { describe, expect, it } from "vitest";

import type { Attack, PlayerState } from "../types";
import { AttackManager } from "./AttackManager";

class FakeAttack implements Attack {
  readonly name = "fake";
  updates = 0;
  destroyed = false;
  finished = false;
  collision = false;

  constructor(private readonly damageKey: string | null) {}

  update(): void {
    this.updates += 1;
  }

  collides(): boolean {
    return this.collision;
  }

  getDamageWindowKey(): string | null {
    return this.damageKey;
  }

  isFinished(): boolean {
    return this.finished;
  }

  destroy(): void {
    this.destroyed = true;
  }
}

const PLAYER = {} as PlayerState;

describe("AttackManager lifecycle", () => {
  it("destroys a finished attack and drops its active key in the same update", () => {
    const manager = new AttackManager();
    const attack = new FakeAttack("ponto:a:1");
    attack.finished = true;
    manager.add(attack);

    manager.update(100, 16, PLAYER);

    expect(attack.updates).toBe(1);
    expect(attack.destroyed).toBe(true);
    expect(manager.getActiveDamageWindowKeys()).toEqual([]);
  });

  it("keeps simultaneous instances and their damage keys independent", () => {
    const manager = new AttackManager();
    const first = new FakeAttack("ponto:a:1");
    const second = new FakeAttack("ponto:b:1");
    manager.add(first);
    manager.add(second);

    expect(manager.getActiveDamageWindowKeys()).toEqual(["ponto:a:1", "ponto:b:1"]);

    first.finished = true;
    manager.update(100, 16, PLAYER);

    expect(manager.getActiveDamageWindowKeys()).toEqual(["ponto:b:1"]);
    expect(first.destroyed).toBe(true);
    expect(second.destroyed).toBe(false);
  });

  it("clear destroys every attack and clears collision and active keys", () => {
    const manager = new AttackManager();
    const first = new FakeAttack("ponto:a:1");
    const second = new FakeAttack("ponto:b:1");
    first.collision = true;
    second.collision = true;
    manager.add(first);
    manager.add(second);
    manager.update(100, 16, PLAYER);

    expect(manager.getCollisionDamageWindowKeys()).toEqual(["ponto:a:1", "ponto:b:1"]);

    manager.clear();

    expect(first.destroyed).toBe(true);
    expect(second.destroyed).toBe(true);
    expect(manager.getCollisionDamageWindowKeys()).toEqual([]);
    expect(manager.getActiveDamageWindowKeys()).toEqual([]);
  });
});
