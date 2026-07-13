import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
import {
  HORUS_ACTIVE_RAY_STRIDE,
  HORUS_RAY_COUNT,
  HORUS_RAY_LENGTH,
  drawHorusEye,
  drawHorusRays,
  type HorusRayVisual,
} from "../rendering/HorusVisuals";
import type { Attack, AttackContext, PlayerState } from "../types";

interface HorusRay extends HorusRayVisual {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  state: "off" | "telegraph" | "active" | "fade";
}

export class HorusSunAttack implements Attack {
  readonly name = "Horus Sun Eye";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private startedAt: number | null = null;
  private readonly center: Phaser.Math.Vector2;
  private readonly duration = 8600;
  private readonly rays: HorusRay[] = [];
  private age = 0;

  constructor(context: AttackContext, time: number) {
    this.context = context;
    this.createdAt = time;
    this.center = new Phaser.Math.Vector2(
      context.bossPosition.x,
      Math.max(42, context.bossPosition.y - Phaser.Math.Clamp(context.arena.size * 0.32, 84, 104)),
    );
    this.graphics = context.scene.add.graphics().setDepth(32);
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    const age = time - this.startedAt;
    this.age = age;
    const baseAngle = age * 0.00072 - Math.PI / 2;
    const pulse = age % 1100;
    const step = Math.floor(age / 1100);

    this.rays.length = 0;
    for (let index = 0; index < HORUS_RAY_COUNT; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / HORUS_RAY_COUNT;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      const start = this.center.clone().add(direction.clone().scale(22));
      const end = this.center.clone().add(direction.scale(HORUS_RAY_LENGTH));
      const selected = (index + step) % HORUS_ACTIVE_RAY_STRIDE === 0;

      let state: HorusRay["state"] = "off";
      if (selected && pulse > 250 && pulse <= 560) {
        state = "telegraph";
      } else if (selected && pulse > 560 && pulse <= 900) {
        state = "active";
      } else if (selected && pulse > 900) {
        state = "fade";
      }

      this.rays.push({ start, end, state });
    }

    this.draw(age);
  }

  collides(player: PlayerState): boolean {
    return this.rays.some((ray) => {
      return ray.state === "active" && circleIntersectsLine(player.position, player.radius, ray.start, ray.end, 10);
    });
  }

  isFinished(): boolean {
    return this.age > this.duration;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(age: number): void {
    this.graphics.clear();
    drawHorusRays(this.graphics, this.rays, { age, variant: "normal" });
    drawHorusEye(this.graphics, this.center, { age, variant: "normal" });
  }
}
