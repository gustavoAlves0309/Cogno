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

    const reach = this.getActiveReach();
    if (reach <= 0) {
      return false;
    }

    const hazard = this.getHazardTriangle(reach);
    const { x, y } = player.position;
    const radius = player.radius;
    return (
      Phaser.Geom.Triangle.Contains(hazard, x, y) ||
      Phaser.Geom.Triangle.Contains(hazard, x - radius, y) ||
      Phaser.Geom.Triangle.Contains(hazard, x + radius, y) ||
      Phaser.Geom.Triangle.Contains(hazard, x, y - radius) ||
      Phaser.Geom.Triangle.Contains(hazard, x, y + radius)
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
    const sourceX = this.side === "left" ? arena.x - 28 : arena.x + arena.size + 28;
    const sourceY = arena.y + arena.size * 0.5;
    const cobraAlpha = this.state === "vanish" ? 1 - progress : 1;
    const emerge = this.state === "emerge" ? progress : 1;
    const headX = sourceX + direction * Phaser.Math.Linear(8, 72, Phaser.Math.Easing.Cubic.Out(emerge));

    if (this.state === "telegraph") {
      this.drawRitualWarning(age, progress);
      this.drawArenaSeals(age, false);
    } else if (this.state === "active") {
      this.drawVenomStrike(age, progress);
      this.drawArenaSeals(age, true);
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

  private getActiveReach(): number {
    const strikeIn = Phaser.Math.Clamp(this.getStateProgress(this.age) / 0.16, 0, 1);
    return Phaser.Math.Easing.Cubic.Out(strikeIn);
  }

  private getHazardTriangle(reach: number): Phaser.Geom.Triangle {
    const clamped = Phaser.Math.Clamp(reach, 0, 1);

    return new Phaser.Geom.Triangle(
      this.triangle.x1,
      this.triangle.y1,
      Phaser.Math.Linear(this.triangle.x1, this.triangle.x2, clamped),
      Phaser.Math.Linear(this.triangle.y1, this.triangle.y2, clamped),
      Phaser.Math.Linear(this.triangle.x1, this.triangle.x3, clamped),
      Phaser.Math.Linear(this.triangle.y1, this.triangle.y3, clamped),
    );
  }

  private drawRitualWarning(age: number, progress: number): void {
    const shimmer = 0.5 + Math.sin(age * 0.02) * 0.5;
    const reveal = Phaser.Math.Easing.Sine.Out(progress);

    this.graphics.fillStyle(0x0a332f, 0.1 + reveal * 0.08);
    this.graphics.fillTriangle(
      this.triangle.x1,
      this.triangle.y1,
      this.triangle.x2,
      this.triangle.y2,
      this.triangle.x3,
      this.triangle.y3,
    );

    this.graphics.lineStyle(3, 0xf0d58a, 0.34 + shimmer * 0.18);
    this.graphics.lineBetween(this.triangle.x1, this.triangle.y1, this.triangle.x2, this.triangle.y2);
    this.graphics.lineBetween(this.triangle.x1, this.triangle.y1, this.triangle.x3, this.triangle.y3);

    this.graphics.lineStyle(1.5, 0x8df7ff, 0.18 + reveal * 0.18);
    this.graphics.lineBetween(this.triangle.x2, this.triangle.y2, this.triangle.x3, this.triangle.y3);

    for (let step = 0.18; step <= 0.88; step += 0.14) {
      const bandAlpha = Phaser.Math.Clamp((reveal - step * 0.42) * 0.8, 0.08, 0.38);
      this.drawTriangleBand(this.triangle, step, step % 0.28 < 0.14 ? 0xf0d58a : 0x8df7ff, bandAlpha, 2);
    }

    for (let step = 0.28; step <= 0.78; step += 0.25) {
      const x = Phaser.Math.Linear(this.triangle.x1, (this.triangle.x2 + this.triangle.x3) * 0.5, step);
      const y = Phaser.Math.Linear(this.triangle.y1, (this.triangle.y2 + this.triangle.y3) * 0.5, step);
      const size = 5 + shimmer * 2;
      this.graphics.lineStyle(1.4, 0xf8f1d1, (0.16 + shimmer * 0.16) * reveal);
      this.graphics.strokeTriangle(x, y - size, x - size, y, x, y + size);
    }
  }

  private drawVenomStrike(age: number, progress: number): void {
    const pulse = 0.5 + Math.sin(age * 0.04) * 0.5;
    const reach = this.getActiveReach();
    const hazard = this.getHazardTriangle(reach);
    const alpha = 0.56 + pulse * 0.08;

    this.graphics.fillStyle(0x0a4f42, 0.36 * reach);
    this.graphics.fillTriangle(hazard.x1, hazard.y1, hazard.x2, hazard.y2, hazard.x3, hazard.y3);
    this.graphics.fillStyle(0x1fbf7f, 0.22 * reach);
    this.graphics.fillTriangle(hazard.x1, hazard.y1, hazard.x2, hazard.y2, hazard.x3, hazard.y3);

    this.graphics.lineStyle(10, 0x1fbf7f, 0.22 * reach);
    this.graphics.lineBetween(hazard.x1, hazard.y1, hazard.x2, hazard.y2);
    this.graphics.lineBetween(hazard.x1, hazard.y1, hazard.x3, hazard.y3);
    this.graphics.lineStyle(3, 0xf0d58a, alpha * reach);
    this.graphics.lineBetween(hazard.x1, hazard.y1, hazard.x2, hazard.y2);
    this.graphics.lineBetween(hazard.x1, hazard.y1, hazard.x3, hazard.y3);

    const waveStart = Phaser.Math.Clamp(reach - 0.72, 0.16, 0.32);
    for (let step = waveStart; step <= reach; step += 0.11) {
      const wave = 0.5 + Math.sin(age * 0.028 + step * 9) * 0.5;
      const width = Phaser.Math.Linear(5, 13, step) + wave * 2;
      this.drawTriangleBand(hazard, step, step > reach - 0.12 ? 0xf8f1d1 : 0x8df7ff, 0.2 + wave * 0.32, width);
    }

    if (reach > 0.04) {
      const lip = Phaser.Math.Clamp(reach, 0.08, 1);
      this.drawTriangleBand(this.triangle, lip, 0xfff2c0, 0.76 * (1 - progress * 0.2), 4);
    }
  }

  private drawCobra(sourceX: number, sourceY: number, headX: number, direction: number, age: number, alpha: number): void {
    const hoodPulse = 0.5 + Math.sin(age * 0.026) * 0.5;
    const segmentCount = 9;

    this.graphics.lineStyle(15, 0x07131b, alpha * 0.72);
    this.graphics.lineBetween(sourceX - direction * 52, sourceY + 2, headX + direction * 8, sourceY + 2);
    this.graphics.lineStyle(9, 0x0f5b46, alpha * 0.84);
    this.graphics.lineBetween(sourceX - direction * 46, sourceY, headX + direction * 10, sourceY);
    this.graphics.lineStyle(3, 0x8df7ff, alpha * 0.24);
    this.graphics.lineBetween(sourceX - direction * 30, sourceY - 4, headX + direction * 18, sourceY - 4);

    for (let index = 0; index < segmentCount; index += 1) {
      const t = index / (segmentCount - 1);
      const x = Phaser.Math.Linear(sourceX - direction * 48, headX - direction * 16, t);
      const y = sourceY + Math.sin(age * 0.014 + index * 0.82) * 6;
      const radius = Phaser.Math.Linear(6.5, 11, t);
      this.graphics.fillStyle(index % 2 === 0 ? 0x0f5b46 : 0x1d7a58, alpha * Phaser.Math.Linear(0.54, 0.9, t));
      this.graphics.fillCircle(x, y, radius);
      this.graphics.lineStyle(1, 0xf0d58a, alpha * Phaser.Math.Linear(0.12, 0.34, t));
      this.graphics.lineBetween(x - direction * radius * 0.58, y - radius * 0.6, x + direction * radius * 0.58, y + radius * 0.6);
    }

    this.graphics.fillStyle(0x061018, alpha * 0.72);
    this.graphics.fillTriangle(
      headX - direction * 16,
      sourceY - 39,
      headX - direction * 16,
      sourceY + 39,
      headX + direction * (39 + hoodPulse * 4),
      sourceY,
    );
    this.graphics.fillStyle(0x0f5b46, alpha);
    this.graphics.fillTriangle(
      headX - direction * 12,
      sourceY - 34,
      headX - direction * 12,
      sourceY + 34,
      headX + direction * (36 + hoodPulse * 4),
      sourceY,
    );
    this.graphics.lineStyle(2, 0xf0d58a, alpha * 0.56);
    this.graphics.lineBetween(headX - direction * 10, sourceY - 27, headX + direction * 24, sourceY - 4);
    this.graphics.lineBetween(headX - direction * 10, sourceY + 27, headX + direction * 24, sourceY + 4);
    this.graphics.lineBetween(headX - direction * 10, sourceY, headX + direction * 28, sourceY);

    this.graphics.fillStyle(0x51ddb0, alpha);
    this.graphics.fillEllipse(headX + direction * 18, sourceY, 36, 28);
    this.graphics.fillStyle(0x0b7f5a, alpha * 0.72);
    this.graphics.fillEllipse(headX + direction * 24, sourceY, 20, 18);
    this.graphics.lineStyle(2, 0xe8ca7f, alpha * 0.8);
    this.graphics.strokeEllipse(headX + direction * 18, sourceY, 45, 36);
    this.graphics.fillStyle(0xf0d174, alpha * 0.98);
    this.graphics.fillCircle(headX + direction * 27, sourceY - 6, 3);
    this.graphics.fillCircle(headX + direction * 27, sourceY + 6, 3);
    this.graphics.lineStyle(2, 0xff8b87, alpha * 0.64);
    this.graphics.lineBetween(headX + direction * 34, sourceY, headX + direction * 49, sourceY - 5);
    this.graphics.lineBetween(headX + direction * 34, sourceY, headX + direction * 49, sourceY + 5);
  }

  private drawTriangleBand(triangle: Phaser.Geom.Triangle, step: number, color: number, alpha: number, width: number): void {
    const clamped = Phaser.Math.Clamp(step, 0, 1);
    const topX = Phaser.Math.Linear(triangle.x1, triangle.x2, clamped);
    const topY = Phaser.Math.Linear(triangle.y1, triangle.y2, clamped);
    const bottomX = Phaser.Math.Linear(triangle.x1, triangle.x3, clamped);
    const bottomY = Phaser.Math.Linear(triangle.y1, triangle.y3, clamped);

    this.graphics.lineStyle(width, color, alpha);
    this.graphics.lineBetween(topX, topY, bottomX, bottomY);
  }

  private drawArenaSeals(age: number, active: boolean): void {
    const { arena } = this.context;
    const x = this.side === "left" ? arena.x + 12 : arena.x + arena.size - 12;
    const topY = arena.y + 12;
    const bottomY = arena.y + arena.size - 12;
    const direction = this.side === "left" ? 1 : -1;
    const pulse = 0.5 + Math.sin(age * 0.032) * 0.5;

    this.graphics.lineStyle(active ? 5 : 3, active ? 0xf0d58a : 0xe8ca7f, active ? 0.68 + pulse * 0.18 : 0.34 + pulse * 0.16);
    this.graphics.lineBetween(x, topY, x + direction * 26, topY);
    this.graphics.lineBetween(x, topY, x, topY + 26);
    this.graphics.lineBetween(x, bottomY, x + direction * 26, bottomY);
    this.graphics.lineBetween(x, bottomY, x, bottomY - 26);

    this.graphics.fillStyle(active ? 0x8df7ff : 0xf0d58a, active ? 0.5 : 0.28);
    this.graphics.fillCircle(x + direction * 32, topY + 4, active ? 3.2 : 2.4);
    this.graphics.fillCircle(x + direction * 32, bottomY - 4, active ? 3.2 : 2.4);
  }
}
