import Phaser from "phaser";
import type { Attack, AttackContext, PlayerState } from "../types";

type WadjetState = "emerge" | "telegraph" | "active" | "linger" | "vanish";

export class WadjetConeAttack implements Attack {
  readonly name = "Wadjet Flank";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private startedAt: number | null = null;
  private readonly side: "left" | "right";
  private readonly emergeMs = 420;
  private readonly telegraphMs = 950;
  private readonly activeMs = 1200;
  private readonly lingerMs = 340;
  private readonly vanishMs = 280;
  private readonly triangle: Phaser.Geom.Triangle;
  private state: WadjetState = "emerge";
  private age = 0;

  constructor(context: AttackContext, time: number, side?: "left" | "right") {
    this.context = context;
    this.createdAt = time;
    this.side = side ?? (Math.random() > 0.5 ? "left" : "right");
    this.graphics = context.scene.add.graphics().setDepth(46);
    this.triangle = this.createTriangle();
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    const age = time - this.startedAt;
    this.age = age;
    this.state = this.getState(age);
    this.draw(age);
  }

  collides(player: PlayerState): boolean {
    if (this.state !== "active") {
      return false;
    }

    const { x, y } = player.position;
    const radius = player.radius;
    return (
      Phaser.Geom.Triangle.Contains(this.triangle, x, y) ||
      Phaser.Geom.Triangle.Contains(this.triangle, x - radius, y) ||
      Phaser.Geom.Triangle.Contains(this.triangle, x + radius, y) ||
      Phaser.Geom.Triangle.Contains(this.triangle, x, y - radius) ||
      Phaser.Geom.Triangle.Contains(this.triangle, x, y + radius)
    );
  }

  isFinished(): boolean {
    return this.age > this.getTotalMs();
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private createTriangle(): Phaser.Geom.Triangle {
    const { arena } = this.context;
    const centerY = arena.y + arena.size * 0.5;
    const top = arena.y - arena.size * 0.04;
    const bottom = arena.y + arena.size * 1.04;

    if (this.side === "left") {
      return new Phaser.Geom.Triangle(
        arena.x - arena.size * 0.2,
        centerY,
        arena.x + arena.size + arena.size * 0.12,
        top,
        arena.x + arena.size + arena.size * 0.12,
        bottom,
      );
    }

    return new Phaser.Geom.Triangle(
      arena.x + arena.size + arena.size * 0.2,
      centerY,
      arena.x - arena.size * 0.12,
      top,
      arena.x - arena.size * 0.12,
      bottom,
    );
  }

  private draw(age: number): void {
    this.graphics.clear();

    const { arena } = this.context;
    const progress = this.getStateProgress(age);
    const direction = this.side === "left" ? 1 : -1;
    const sourceX = this.side === "left" ? arena.x - 22 : arena.x + arena.size + 22;
    const sourceY = arena.y + arena.size * 0.5;
    const cobraAlpha = this.state === "vanish" ? 1 - progress : 1;
    const emerge = this.state === "emerge" ? progress : 1;
    const headX = sourceX + direction * Phaser.Math.Linear(10, 58, Phaser.Math.Easing.Cubic.Out(emerge));

    if (this.state === "telegraph") {
      this.drawCone(age, 0.34 + progress * 0.12, 0.86, false);
      this.drawSafeCorners(false);
    } else if (this.state === "active") {
      const pulse = 0.5 + Math.sin(age * 0.04) * 0.5;
      this.drawCone(age, 0.68 + pulse * 0.08, 1, true);
      this.drawSafeCorners(true);
    }

    this.drawCobra(sourceX, sourceY, headX, direction, age, cobraAlpha);
  }

  private getTotalMs(): number {
    return this.emergeMs + this.telegraphMs + this.activeMs + this.lingerMs + this.vanishMs;
  }

  private getState(age: number): WadjetState {
    if (age < this.emergeMs) {
      return "emerge";
    }

    if (age < this.emergeMs + this.telegraphMs) {
      return "telegraph";
    }

    if (age < this.emergeMs + this.telegraphMs + this.activeMs) {
      return "active";
    }

    if (age < this.emergeMs + this.telegraphMs + this.activeMs + this.lingerMs) {
      return "linger";
    }

    return "vanish";
  }

  private getStateProgress(age: number): number {
    const starts: Record<WadjetState, number> = {
      emerge: 0,
      telegraph: this.emergeMs,
      active: this.emergeMs + this.telegraphMs,
      linger: this.emergeMs + this.telegraphMs + this.activeMs,
      vanish: this.emergeMs + this.telegraphMs + this.activeMs + this.lingerMs,
    };
    const durations: Record<WadjetState, number> = {
      emerge: this.emergeMs,
      telegraph: this.telegraphMs,
      active: this.activeMs,
      linger: this.lingerMs,
      vanish: this.vanishMs,
    };

    return Phaser.Math.Clamp((age - starts[this.state]) / durations[this.state], 0, 1);
  }

  private drawCone(age: number, fillAlpha: number, edgeAlpha: number, active: boolean): void {
    const shimmer = 0.5 + Math.sin(age * 0.022) * 0.5;

    this.graphics.fillStyle(active ? 0x1fbf7f : 0x2ed194, fillAlpha);
    this.graphics.fillTriangle(
      this.triangle.x1,
      this.triangle.y1,
      this.triangle.x2,
      this.triangle.y2,
      this.triangle.x3,
      this.triangle.y3,
    );

    this.graphics.lineStyle(active ? 8 : 4, active ? 0x9effc8 : 0xa4ffd0, edgeAlpha);
    this.graphics.lineBetween(this.triangle.x1, this.triangle.y1, this.triangle.x2, this.triangle.y2);
    this.graphics.lineBetween(this.triangle.x1, this.triangle.y1, this.triangle.x3, this.triangle.y3);

    this.graphics.lineStyle(2, 0xe8ca7f, active ? 0.42 : 0.2 + shimmer * 0.18);
    for (let step = 0.18; step <= 0.86; step += 0.16) {
      const topX = Phaser.Math.Linear(this.triangle.x1, this.triangle.x2, step);
      const topY = Phaser.Math.Linear(this.triangle.y1, this.triangle.y2, step);
      const bottomX = Phaser.Math.Linear(this.triangle.x1, this.triangle.x3, step);
      const bottomY = Phaser.Math.Linear(this.triangle.y1, this.triangle.y3, step);
      this.graphics.lineBetween(topX, topY, bottomX, bottomY);
    }
  }

  private drawCobra(sourceX: number, sourceY: number, headX: number, direction: number, age: number, alpha: number): void {
    const hoodPulse = 0.5 + Math.sin(age * 0.026) * 0.5;
    const segmentCount = 7;

    this.graphics.lineStyle(8, 0x0f5b46, alpha * 0.72);
    this.graphics.lineBetween(sourceX - direction * 30, sourceY, headX + direction * 10, sourceY);
    this.graphics.lineStyle(3, 0x9effc8, alpha * 0.34);
    this.graphics.lineBetween(sourceX - direction * 18, sourceY - 3, headX + direction * 18, sourceY - 3);

    for (let index = 0; index < segmentCount; index += 1) {
      const t = index / (segmentCount - 1);
      const x = Phaser.Math.Linear(sourceX - direction * 28, headX - direction * 13, t);
      const y = sourceY + Math.sin(age * 0.014 + index * 0.9) * 7;
      const radius = Phaser.Math.Linear(7, 12, t);
      this.graphics.fillStyle(index % 2 === 0 ? 0x0f5b46 : 0x1d7a58, alpha * Phaser.Math.Linear(0.62, 0.92, t));
      this.graphics.fillCircle(x, y, radius);
    }

    this.graphics.fillStyle(0x0f5b46, alpha);
    this.graphics.fillTriangle(
      headX - direction * 12,
      sourceY - 30,
      headX - direction * 12,
      sourceY + 30,
      headX + direction * (32 + hoodPulse * 4),
      sourceY,
    );
    this.graphics.fillStyle(0x51ddb0, alpha);
    this.graphics.fillEllipse(headX + direction * 18, sourceY, 34, 27);
    this.graphics.lineStyle(2, 0xe8ca7f, alpha * 0.72);
    this.graphics.strokeEllipse(headX + direction * 18, sourceY, 43, 34);
    this.graphics.fillStyle(0xf0d174, alpha * 0.98);
    this.graphics.fillCircle(headX + direction * 27, sourceY - 6, 3);
    this.graphics.fillCircle(headX + direction * 27, sourceY + 6, 3);
    this.graphics.lineStyle(2, 0xff8b87, alpha * 0.64);
    this.graphics.lineBetween(headX + direction * 34, sourceY, headX + direction * 49, sourceY - 5);
    this.graphics.lineBetween(headX + direction * 34, sourceY, headX + direction * 49, sourceY + 5);
  }

  private drawSafeCorners(active: boolean): void {
    const { arena } = this.context;
    const x = this.side === "left" ? arena.x + 12 : arena.x + arena.size - 12;
    const topY = arena.y + 12;
    const bottomY = arena.y + arena.size - 12;
    const direction = this.side === "left" ? 1 : -1;

    this.graphics.lineStyle(5, 0xe8ca7f, active ? 0.7 : 0.36);
    this.graphics.lineBetween(x, topY, x + direction * 26, topY);
    this.graphics.lineBetween(x, topY, x, topY + 26);
    this.graphics.lineBetween(x, bottomY, x + direction * 26, bottomY);
    this.graphics.lineBetween(x, bottomY, x, bottomY - 26);
  }
}
