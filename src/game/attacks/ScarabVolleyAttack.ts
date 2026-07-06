import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

interface ScarabProjectile {
  spawnTime: number;
  start: Phaser.Math.Vector2;
  velocity: Phaser.Math.Vector2;
  position: Phaser.Math.Vector2;
  targetLineEnd: Phaser.Math.Vector2;
}

export class ScarabVolleyAttack implements Attack {
  readonly name = "Escaravelhos Da Coroa";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private readonly projectiles: ScarabProjectile[] = [];
  private readonly duration = 3600;
  private readonly speed = 285;
  private readonly spawnDelays = [250, 560, 870];

  constructor(context: AttackContext, time: number) {
    this.context = context;
    this.createdAt = time;
    this.graphics = context.scene.add.graphics().setDepth(35);
  }

  update(time: number, delta: number): void {
    const age = time - this.createdAt;

    for (const delay of this.spawnDelays) {
      const alreadySpawned = this.projectiles.some((projectile) => projectile.spawnTime === this.createdAt + delay);
      if (!alreadySpawned && age >= delay) {
        this.spawnProjectile(this.createdAt + delay);
      }
    }

    const dt = delta / 1000;
    for (const projectile of this.projectiles) {
      const activeAge = Math.max(0, time - projectile.spawnTime);
      projectile.position.copy(projectile.start).add(projectile.velocity.clone().scale(activeAge / 1000));
      projectile.targetLineEnd.copy(projectile.start).add(projectile.velocity.clone().normalize().scale(760));
    }

    this.draw(time);
  }

  collides(player: PlayerState): boolean {
    return this.projectiles.some((projectile) => {
      return Phaser.Math.Distance.Between(
        player.position.x,
        player.position.y,
        projectile.position.x,
        projectile.position.y,
      ) <= player.radius + 9;
    });
  }

  isFinished(): boolean {
    return this.context.scene.time.now - this.createdAt > this.duration;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private spawnProjectile(spawnTime: number): void {
    const start = this.context.bossPosition.clone();
    const target = this.context.player.position.clone();
    const direction = target.subtract(start).normalize();
    const velocity = direction.scale(this.speed);

    this.projectiles.push({
      spawnTime,
      start,
      velocity,
      position: start.clone(),
      targetLineEnd: start.clone(),
    });
  }

  private draw(time: number): void {
    this.graphics.clear();

    const bossPulse = 0.45 + Math.sin(time * 0.02) * 0.22;
    this.graphics.lineStyle(2, 0xeec762, bossPulse);

    for (const projectile of this.projectiles) {
      this.graphics.lineStyle(2, 0xeec762, 0.13);
      this.graphics.lineBetween(projectile.start.x, projectile.start.y, projectile.targetLineEnd.x, projectile.targetLineEnd.y);

      this.graphics.fillStyle(0xe8bd55, 0.92);
      this.graphics.fillEllipse(projectile.position.x, projectile.position.y, 18, 12);
      this.graphics.lineStyle(2, 0xffe39b, 0.75);
      this.graphics.strokeEllipse(projectile.position.x, projectile.position.y, 21, 14);
      this.graphics.lineStyle(1, 0x2b1d0b, 0.65);
      this.graphics.lineBetween(projectile.position.x - 7, projectile.position.y, projectile.position.x + 7, projectile.position.y);
    }
  }
}
