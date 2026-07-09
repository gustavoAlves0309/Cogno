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
    const fillAlpha = active ? 0.46 + pulse * 0.08 : 0.2 + pulse * 0.08;

    this.graphics.fillStyle(active ? 0xc85a4f : 0xd8b65d, fillAlpha * alpha);
    this.graphics.fillCircle(this.center.x, this.center.y, this.currentRadius);
    this.graphics.fillStyle(0x35d6cb, (active ? 0.16 : 0.08) * alpha);
    this.graphics.fillCircle(this.center.x, this.center.y, Math.max(0, this.currentRadius - 16));
  }

  private drawOuterRing(alpha: number, pulse: number): void {
    const active = this.state === "expand" || this.state === "hold";

    this.graphics.lineStyle(active ? 7 : 4, active ? 0xffd36f : 0x8df7ff, (0.72 + pulse * 0.24) * alpha);
    this.graphics.strokeCircle(this.center.x, this.center.y, this.currentRadius);
    this.graphics.lineStyle(2.2, 0xf8f1d1, (active ? 0.62 : 0.36) * alpha);
    this.graphics.strokeCircle(this.center.x, this.center.y, Math.max(4, this.currentRadius - 11));
  }

  private drawRadialMarks(alpha: number, pulse: number): void {
    const marks = 18;
    const rotation = this.age * 0.0014;
    const inner = Math.max(18, this.currentRadius - 17);
    const outer = this.currentRadius + 8;

    this.graphics.lineStyle(2.6, 0x8df7ff, (0.34 + pulse * 0.26) * alpha);
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

      if (index % 3 === 0) {
        this.graphics.lineBetween(start.x, start.y, end.x, end.y);
      } else {
        this.graphics.fillStyle(index % 2 === 0 ? 0xf0d58a : 0x8df7ff, (0.36 + pulse * 0.22) * alpha);
        this.graphics.fillCircle(end.x, end.y, 3.1);
      }
    }
  }

  private drawCentralGlyph(alpha: number, pulse: number): void {
    const size = Phaser.Math.Clamp(this.currentRadius * 0.34, 18, 38);
    const x = this.center.x;
    const y = this.center.y;
    const glow = 0.58 + pulse * 0.26;

    this.graphics.lineStyle(8, 0x071018, 0.48 * alpha);
    this.graphics.strokeCircle(x, y - size * 0.45, size * 0.26);
    this.graphics.lineStyle(3, 0xf0d58a, glow * alpha);
    this.graphics.strokeCircle(x, y - size * 0.45, size * 0.26);

    this.graphics.lineStyle(4, 0x35d6cb, 0.75 * alpha);
    this.graphics.lineBetween(x, y - size * 0.18, x, y + size * 0.72);
    this.graphics.lineBetween(x - size * 0.5, y + size * 0.08, x + size * 0.5, y + size * 0.08);
    this.graphics.lineStyle(3, 0xf8f1d1, 0.5 * alpha);
    this.graphics.lineBetween(x - size * 0.34, y + size * 0.48, x, y + size * 0.72);
    this.graphics.lineBetween(x + size * 0.34, y + size * 0.48, x, y + size * 0.72);

    this.graphics.fillStyle(0xf0d58a, 0.7 * alpha);
    this.graphics.fillCircle(x, y + size * 0.08, 3.4);
    this.graphics.fillStyle(0x8df7ff, 0.68 * alpha);
    this.graphics.fillTriangle(
      x,
      y - size * 0.82,
      x - size * 0.16,
      y - size * 0.56,
      x + size * 0.16,
      y - size * 0.56,
    );
  }
}
