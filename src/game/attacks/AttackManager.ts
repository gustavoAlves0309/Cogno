import type { Attack, PlayerState } from "../types";

export class AttackManager {
  private readonly attacks: Attack[] = [];

  add(attack: Attack): void {
    this.attacks.push(attack);
  }

  update(time: number, delta: number, player: PlayerState): boolean {
    let didCollide = false;

    for (const attack of this.attacks) {
      attack.update(time, delta);
      didCollide = attack.collides(player) || didCollide;
    }

    for (let i = this.attacks.length - 1; i >= 0; i -= 1) {
      if (this.attacks[i].isFinished()) {
        this.attacks[i].destroy();
        this.attacks.splice(i, 1);
      }
    }

    return didCollide;
  }

  clear(): void {
    for (const attack of this.attacks) {
      attack.destroy();
    }
    this.attacks.length = 0;
  }
}
