import type { Attack, PlayerState } from "../types";

export class AttackManager {
  private readonly attacks: Attack[] = [];
  private readonly collisionDamageWindowKeys: Array<string | null> = [];

  add(attack: Attack): void {
    this.attacks.push(attack);
  }

  update(time: number, delta: number, player: PlayerState): boolean {
    let didCollide = false;
    this.collisionDamageWindowKeys.length = 0;

    for (const attack of this.attacks) {
      attack.update(time, delta);
      if (attack.collides(player)) {
        didCollide = true;
        this.collisionDamageWindowKeys.push(attack.getDamageWindowKey?.() ?? null);
      }
    }

    for (let i = this.attacks.length - 1; i >= 0; i -= 1) {
      if (this.attacks[i].isFinished()) {
        this.attacks[i].destroy();
        this.attacks.splice(i, 1);
      }
    }

    return didCollide;
  }

  getCollisionDamageWindowKeys(): readonly (string | null)[] {
    return this.collisionDamageWindowKeys;
  }

  getActiveDamageWindowKeys(): readonly string[] {
    const keys: string[] = [];
    for (const attack of this.attacks) {
      const key = attack.getDamageWindowKey?.();
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  clear(): void {
    for (const attack of this.attacks) {
      attack.destroy();
    }
    this.attacks.length = 0;
    this.collisionDamageWindowKeys.length = 0;
  }
}
