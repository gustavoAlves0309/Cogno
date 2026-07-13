import Phaser from "phaser";
import { drawScarabBody, drawScarabTrail } from "../rendering/ScarabVisuals";
import type { Attack, AttackContext, PlayerState } from "../types";

interface ScarabProjectile {
  spawnTime: number;
  start: Phaser.Math.Vector2;
  velocity: Phaser.Math.Vector2;
  position: Phaser.Math.Vector2;
  expired: boolean;
}

export interface ScarabRewindTrajectory {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  delay: number;
  travelMs: number;
}

interface ScarabVolleyOptions {
  projectileCount?: number;
}

const SCARAB_SPAWN_DELAYS = [180, 420, 660, 900, 1140] as const;
export const SCARAB_REWIND_TRAJECTORY_COUNT = SCARAB_SPAWN_DELAYS.length;

export class ScarabVolleyAttack implements Attack {
  readonly name = "Crown Scarabs";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private readonly onTrajectory?: (trajectory: ScarabRewindTrajectory) => void;
  private startedAt: number | null = null;
  private readonly projectiles: ScarabProjectile[] = [];
  private readonly spawnedDelays = new Set<number>();
  private readonly duration = 4300;
  private readonly speed = 315;
  private readonly spawnDelays: readonly number[];
  private age = 0;

  constructor(
    context: AttackContext,
    time: number,
    onTrajectory?: (trajectory: ScarabRewindTrajectory) => void,
    options: ScarabVolleyOptions = {},
  ) {
    this.context = context;
    this.createdAt = time;
    this.onTrajectory = onTrajectory;
    const projectileCount = Phaser.Math.Clamp(
      Math.floor(options.projectileCount ?? SCARAB_SPAWN_DELAYS.length),
      1,
      SCARAB_SPAWN_DELAYS.length,
    );
    this.spawnDelays = SCARAB_SPAWN_DELAYS.slice(0, projectileCount);
    this.graphics = context.scene.add.graphics().setDepth(35);
  }

  update(time: number, _delta: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    const startedAt = this.startedAt;
    const age = time - startedAt;
    this.age = age;

    for (const delay of this.spawnDelays) {
      const spawnTime = startedAt + delay;
      if (!this.spawnedDelays.has(delay) && age >= delay) {
        this.spawnedDelays.add(delay);
        this.spawnProjectile(spawnTime);
      }
    }

    for (const projectile of this.projectiles) {
      const activeAge = Math.max(0, time - projectile.spawnTime);
      projectile.position.copy(projectile.start).add(projectile.velocity.clone().scale(activeAge / 1000));
      projectile.expired = this.isOutsideCombatSpace(projectile.position);
    }

    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      if (this.projectiles[index].expired) {
        this.projectiles.splice(index, 1);
      }
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
    return this.age > this.duration;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private spawnProjectile(spawnTime: number): void {
    const start = this.context.bossPosition.clone();
    const target = this.context.player.position.clone();
    const direction = target.subtract(start).normalize();
    const velocity = direction.clone().scale(this.speed);
    const end = this.getCombatExitPoint(start, direction);
    const travelMs = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y) / this.speed * 1000;

    this.projectiles.push({
      spawnTime,
      start,
      velocity,
      position: start.clone(),
      expired: false,
    });

    this.onTrajectory?.({
      start: start.clone(),
      end,
      delay: this.startedAt === null ? 0 : spawnTime - this.startedAt,
      travelMs,
    });
  }

  private getCombatExitPoint(start: Phaser.Math.Vector2, direction: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const point = start.clone();

    for (let distance = 24; distance <= 920; distance += 12) {
      point.copy(start).add(direction.clone().scale(distance));
      if (this.isOutsideCombatSpace(point)) {
        return point.clone();
      }
    }

    return start.clone().add(direction.clone().scale(920));
  }

  private isOutsideCombatSpace(position: Phaser.Math.Vector2): boolean {
    const { arena, bossPosition } = this.context;
    const margin = 34;

    return (
      position.x < arena.x - margin ||
      position.x > arena.x + arena.size + margin ||
      position.y < bossPosition.y - margin ||
      position.y > arena.y + arena.size + margin
    );
  }

  private draw(time: number): void {
    this.graphics.clear();

    for (const projectile of this.projectiles) {
      const direction = projectile.velocity.clone().normalize();
      drawScarabTrail(this.graphics, projectile.position, direction, { variant: "normal" });
      drawScarabBody(this.graphics, projectile.position, direction, {
        variant: "normal",
        time: time - projectile.spawnTime,
      });
    }
  }
}
