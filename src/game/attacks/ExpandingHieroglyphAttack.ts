import Phaser from "phaser";
import type { Attack, AttackContext, PlayerState } from "../types";

type GlyphState = "inscribe" | "expand" | "hold" | "fade";

export class ExpandingHieroglyphAttack implements Attack {
  readonly name = "Expanding Hieroglyph";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly center: Phaser.Math.Vector2;
  private readonly maxRadius: number;
  private readonly inscribeMs = 880;
  private readonly expandMs = 1380;
  private readonly holdMs = 620;
  private readonly fadeMs = 380;
  private startedAt: number | null = null;
  private state: GlyphState = "inscribe";
  private currentRadius = 0;
  private age = 0;

  constructor(context: AttackContext, _time: number) {
    this.context = context;
    this.center = new Phaser.Math.Vector2(
      context.arena.x + context.arena.size / 2,
      context.arena.y + context.arena.size / 2,
    );
    this.maxRadius = context.arena.size * 0.36;
    this.graphics = context.scene.add.graphics().setDepth(56);
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    this.age = time - this.startedAt;
    this.state = this.getState(this.age);
    this.currentRadius = this.getRadius();
    this.draw();
  }

  collides(player: PlayerState): boolean {
    if (this.state !== "expand" && this.state !== "hold") {
      return false;
    }

    return Phaser.Math.Distance.Between(
      player.position.x,
      player.position.y,
      this.center.x,
      this.center.y,
    ) <= this.currentRadius + player.radius;
  }

  isFinished(): boolean {
    return this.age > this.inscribeMs + this.expandMs + this.holdMs + this.fadeMs;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private getState(age: number): GlyphState {
    if (age < this.inscribeMs) {
      return "inscribe";
    }

    if (age < this.inscribeMs + this.expandMs) {
      return "expand";
    }

    if (age < this.inscribeMs + this.expandMs + this.holdMs) {
      return "hold";
    }

    return "fade";
  }

  private stateProgress(): number {
    const starts: Record<GlyphState, number> = {
      inscribe: 0,
      expand: this.inscribeMs,
      hold: this.inscribeMs + this.expandMs,
      fade: this.inscribeMs + this.expandMs + this.holdMs,
    };
    const durations: Record<GlyphState, number> = {
      inscribe: this.inscribeMs,
      expand: this.expandMs,
      hold: this.holdMs,
      fade: this.fadeMs,
    };

    return Phaser.Math.Clamp((this.age - starts[this.state]) / durations[this.state], 0, 1);
  }

  private getRadius(): number {
    if (this.state === "inscribe") {
      return Phaser.Math.Linear(10, 30, Phaser.Math.Easing.Sine.Out(this.stateProgress()));
    }

    if (this.state === "expand") {
      return Phaser.Math.Linear(30, this.maxRadius, Phaser.Math.Easing.Cubic.Out(this.stateProgress()));
    }

    return this.maxRadius;
  }

  private draw(): void {
    this.graphics.clear();

    const progress = this.stateProgress();
    const fadeAlpha = this.state === "fade" ? 1 - progress : 1;
    const pulse = 0.5 + Math.sin(this.age * 0.026) * 0.5;

    this.drawWarningField(fadeAlpha, pulse);
    this.drawOuterRing(fadeAlpha, pulse);
    this.drawRadialMarks(fadeAlpha, pulse);
    this.drawCentralGlyph(fadeAlpha, pulse);
  }

  private drawWarningField(alpha: number, pulse: number): void {
    const active = this.state === "expand" || this.state === "hold";
    const radius = this.currentRadius;
    const fillAlpha = active ? 0.4 + pulse * 0.08 : 0.15 + pulse * 0.07;

    this.graphics.fillStyle(active ? 0x9d3837 : 0xd8b65d, fillAlpha * alpha);
    this.graphics.fillCircle(this.center.x, this.center.y, radius);
    this.graphics.fillStyle(0x071018, (active ? 0.28 : 0.2) * alpha);
    this.graphics.fillCircle(this.center.x, this.center.y, Math.max(0, radius - 13));
    this.graphics.fillStyle(0x35d6cb, (active ? 0.12 : 0.07) * alpha);
    this.graphics.fillCircle(this.center.x, this.center.y, Math.max(0, radius - 24));

    this.drawEtchedBands(radius, active, alpha, pulse);
  }

  private drawOuterRing(alpha: number, pulse: number): void {
    const active = this.state === "expand" || this.state === "hold";
    const radius = this.currentRadius;

    this.graphics.lineStyle(active ? 8 : 5, 0x05070c, 0.28 * alpha);
    this.graphics.strokeCircle(this.center.x, this.center.y, radius + 2);
    this.graphics.lineStyle(active ? 5.4 : 3.8, active ? 0xffd36f : 0xf0d58a, (0.74 + pulse * 0.22) * alpha);
    this.graphics.strokeCircle(this.center.x, this.center.y, radius);
    this.graphics.lineStyle(2.2, active ? 0xf8f1d1 : 0x8df7ff, (active ? 0.58 : 0.44) * alpha);
    this.graphics.strokeCircle(this.center.x, this.center.y, Math.max(4, radius - 11));
    this.graphics.lineStyle(1.4, 0x35d6cb, (0.24 + pulse * 0.16) * alpha);
    this.graphics.strokeCircle(this.center.x, this.center.y, Math.max(4, radius - 23));
  }

  private drawRadialMarks(alpha: number, pulse: number): void {
    const marks = 20;
    const active = this.state === "expand" || this.state === "hold";
    const rotation = this.age * 0.0011;
    const inner = Math.max(16, this.currentRadius - 18);
    const outer = this.currentRadius + 8;

    this.graphics.lineStyle(2.2, 0x8df7ff, (0.28 + pulse * 0.18) * alpha);
    for (let index = 0; index < marks; index += 1) {
      const angle = rotation + (Math.PI * 2 * index) / marks;
      const start = new Phaser.Math.Vector2(
        this.center.x + Math.cos(angle) * inner,
        this.center.y + Math.sin(angle) * inner,
      );
      const end = new Phaser.Math.Vector2(
        this.center.x + Math.cos(angle) * outer,
        this.center.y + Math.sin(angle) * outer,
      );

      if (index % 5 === 0) {
        this.graphics.lineBetween(start.x, start.y, end.x, end.y);
        this.drawOrbitGlyph(end.x, end.y, 7.2, index / 5, alpha, pulse, active);
      } else if (index % 2 === 0) {
        this.graphics.fillStyle(active ? 0xffd36f : 0xf0d58a, (0.42 + pulse * 0.18) * alpha);
        this.graphics.fillTriangle(end.x, end.y - 3.8, end.x - 3.6, end.y + 3.4, end.x + 3.6, end.y + 3.4);
      } else {
        this.graphics.fillStyle(0x8df7ff, (0.32 + pulse * 0.18) * alpha);
        this.graphics.fillCircle(end.x, end.y, 2.2);
      }
    }
  }

  private drawCentralGlyph(alpha: number, pulse: number): void {
    const size = Phaser.Math.Clamp(this.currentRadius * 0.34, 18, 38);
    const x = this.center.x;
    const y = this.center.y;
    const glow = 0.58 + pulse * 0.26;
    const active = this.state === "expand" || this.state === "hold";

    this.graphics.fillStyle(0x02050a, 0.36 * alpha);
    this.graphics.fillEllipse(x, y + size * 0.74, size * 1.36, size * 0.22);
    this.graphics.fillStyle(0x071018, 0.78 * alpha);
    this.graphics.fillEllipse(x, y, size * 1.12, size * 1.72);
    this.graphics.lineStyle(3.2, active ? 0xffd36f : 0xf0d58a, glow * alpha);
    this.graphics.strokeEllipse(x, y, size * 1.12, size * 1.72);
    this.graphics.lineStyle(1.4, 0x8df7ff, 0.42 * alpha);
    this.graphics.strokeEllipse(x, y, size * 0.82, size * 1.42);

    this.graphics.lineStyle(4.4, 0x05070c, 0.4 * alpha);
    this.graphics.strokeEllipse(x, y - size * 0.16, size * 0.68, size * 0.28);
    this.graphics.lineStyle(2.4, 0xf8f1d1, 0.62 * alpha);
    this.graphics.strokeEllipse(x, y - size * 0.16, size * 0.68, size * 0.28);
    this.graphics.fillStyle(0x35d6cb, 0.74 * alpha);
    this.graphics.fillCircle(x, y - size * 0.16, size * 0.11);
    this.graphics.fillStyle(0xf0d58a, 0.92 * alpha);
    this.graphics.fillCircle(x, y - size * 0.16, size * 0.052);

    this.graphics.lineStyle(3, 0x35d6cb, 0.78 * alpha);
    this.graphics.lineBetween(x, y + size * 0.03, x, y + size * 0.62);
    this.graphics.lineBetween(x - size * 0.34, y + size * 0.2, x + size * 0.34, y + size * 0.2);
    this.graphics.lineStyle(2, 0xf0d58a, 0.64 * alpha);
    this.graphics.lineBetween(x - size * 0.28, y + size * 0.46, x, y + size * 0.68);
    this.graphics.lineBetween(x + size * 0.28, y + size * 0.46, x, y + size * 0.68);
  }

  private drawEtchedBands(radius: number, active: boolean, alpha: number, pulse: number): void {
    if (radius < 28) {
      return;
    }

    const bandAlpha = (active ? 0.22 : 0.14) * alpha;
    this.graphics.lineStyle(1.2, active ? 0xf8f1d1 : 0x8df7ff, bandAlpha);
    for (let offset = -radius + 18; offset <= radius - 18; offset += 18) {
      const halfWidth = Math.sqrt(Math.max(0, radius * radius - offset * offset)) - 10;
      const y = this.center.y + offset + Math.sin(this.age * 0.012 + offset * 0.08) * (1.3 + pulse);

      if (halfWidth > 16) {
        this.graphics.lineBetween(this.center.x - halfWidth, y, this.center.x + halfWidth, y);
      }
    }
  }

  private drawOrbitGlyph(
    x: number,
    y: number,
    size: number,
    variant: number,
    alpha: number,
    pulse: number,
    active: boolean,
  ): void {
    const color = active ? 0xffd36f : 0xf0d58a;
    const accent = active ? 0xf8f1d1 : 0x8df7ff;
    const markAlpha = (0.48 + pulse * 0.2) * alpha;

    this.graphics.lineStyle(1.8, color, markAlpha);
    this.graphics.fillStyle(color, markAlpha * 0.72);

    if (variant % 4 === 0) {
      this.graphics.strokeEllipse(x, y, size * 1.08, size * 0.62);
      this.graphics.fillCircle(x, y, size * 0.18);
      return;
    }

    if (variant % 4 === 1) {
      this.graphics.lineBetween(x, y - size * 0.62, x, y + size * 0.56);
      this.graphics.lineBetween(x - size * 0.34, y - size * 0.08, x + size * 0.34, y - size * 0.08);
      this.graphics.lineStyle(1.2, accent, markAlpha * 0.72);
      this.graphics.strokeCircle(x, y - size * 0.52, size * 0.22);
      return;
    }

    if (variant % 4 === 2) {
      this.graphics.fillTriangle(x, y - size * 0.62, x - size * 0.48, y + size * 0.36, x + size * 0.48, y + size * 0.36);
      this.graphics.lineStyle(1.1, accent, markAlpha * 0.64);
      this.graphics.lineBetween(x - size * 0.2, y + size * 0.1, x + size * 0.2, y + size * 0.1);
      return;
    }

    this.graphics.lineBetween(x - size * 0.42, y - size * 0.42, x + size * 0.42, y - size * 0.42);
    this.graphics.lineBetween(x + size * 0.42, y - size * 0.42, x, y + size * 0.46);
    this.graphics.lineBetween(x, y + size * 0.46, x - size * 0.42, y - size * 0.42);
    this.graphics.fillStyle(accent, markAlpha * 0.72);
    this.graphics.fillCircle(x, y - size * 0.1, size * 0.14);
  }
}
