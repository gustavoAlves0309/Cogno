import Phaser from "phaser";
import type { Attack, AttackContext, PlayerState } from "../types";

export type LeonardoStudyVersion = 1 | 2 | 3;

interface HeartPulse {
  start: number;
  duration: number;
  scale: number;
  side: "all" | "left" | "right";
}

export class LeonardoValvulaCoracaoAttack implements Attack {
  readonly name = "Valvula do Coracao";

  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly pulses: readonly HeartPulse[];
  private readonly telegraphMs = 1280;
  private readonly fadeMs = 620;
  private startedAt: number | null = null;
  private age = 0;

  constructor(
    private readonly context: AttackContext,
    _time: number,
    readonly version: LeonardoStudyVersion,
  ) {
    this.graphics = context.scene.add.graphics().setDepth(43);
    this.pulses = this.createPulses(version);
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    this.age = time - this.startedAt;
    this.draw();
  }

  collides(player: PlayerState): boolean {
    if (this.age < this.telegraphMs) {
      return false;
    }

    const pulseAge = this.age - this.telegraphMs;
    const arena = this.context.arena;
    const centerX = arena.x + arena.size / 2;
    const centerY = arena.y + arena.size * 0.5;

    return this.pulses.some((pulse) => {
      const local = pulseAge - pulse.start;
      if (local < 0 || local > pulse.duration) {
        return false;
      }

      if (pulse.side === "left" && player.position.x > centerX + player.radius) {
        return false;
      }
      if (pulse.side === "right" && player.position.x < centerX - player.radius) {
        return false;
      }

      const progress = Phaser.Math.Easing.Sine.Out(Phaser.Math.Clamp(local / pulse.duration, 0, 1));
      const radius = Phaser.Math.Linear(arena.size * 0.065, arena.size * pulse.scale, progress);
      const thickness = Phaser.Math.Clamp(arena.size * 0.07, 15, 24);
      const distance = Phaser.Math.Distance.Between(player.position.x, player.position.y, centerX, centerY);
      return Math.abs(distance - radius) <= thickness / 2 + player.radius;
    });
  }

  isFinished(): boolean {
    const last = this.pulses[this.pulses.length - 1];
    return this.age > this.telegraphMs + last.start + last.duration + this.fadeMs;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private createPulses(version: LeonardoStudyVersion): readonly HeartPulse[] {
    if (version === 1) {
      return [
        { start: 0, duration: 690, scale: 0.52, side: "all" },
        { start: 1080, duration: 690, scale: 0.52, side: "all" },
        { start: 2160, duration: 690, scale: 0.52, side: "all" },
      ];
    }

    if (version === 2) {
      return [
        { start: 0, duration: 700, scale: 0.56, side: "left" },
        { start: 1020, duration: 700, scale: 0.56, side: "right" },
        { start: 2040, duration: 700, scale: 0.56, side: "left" },
      ];
    }

    return [
      { start: 0, duration: 500, scale: 0.3, side: "left" },
      { start: 760, duration: 500, scale: 0.3, side: "right" },
      { start: 1540, duration: 900, scale: 0.7, side: "all" },
    ];
  }

  private draw(): void {
    this.graphics.clear();

    const { arena } = this.context;
    const centerX = arena.x + arena.size / 2;
    const centerY = arena.y + arena.size * 0.5;
    const charge = Phaser.Math.Clamp(this.age / this.telegraphMs, 0, 1);
    const pulse = 0.5 + Math.sin(this.age * 0.013) * 0.5;
    const pulseAge = Math.max(0, this.age - this.telegraphMs);
    const fading = this.isFinished()
      ? Phaser.Math.Clamp((this.age - this.telegraphMs - this.pulses[this.pulses.length - 1].start - this.pulses[this.pulses.length - 1].duration) / this.fadeMs, 0, 1)
      : 0;
    const alpha = 1 - fading;

    this.drawAnatomicalStudy(centerX, centerY, charge, pulse, alpha);
    this.drawChamberGuides(centerX, centerY, charge, pulse, alpha);

    if (this.age < this.telegraphMs) {
      this.drawPulsePreview(centerX, centerY, this.pulses[0], charge, alpha);
      return;
    }

    for (const heartPulse of this.pulses) {
      const local = pulseAge - heartPulse.start;
      const telegraph = Phaser.Math.Clamp((pulseAge - Math.max(0, heartPulse.start - 480)) / 480, 0, 1);
      if (local < -480) {
        continue;
      }

      if (local < 0) {
        this.drawPulsePreview(centerX, centerY, heartPulse, telegraph, alpha);
        continue;
      }

      if (local <= heartPulse.duration) {
        this.drawPulseActive(centerX, centerY, heartPulse, local / heartPulse.duration, pulse, alpha);
      }
    }
  }

  private drawAnatomicalStudy(
    x: number,
    y: number,
    charge: number,
    pulse: number,
    alpha: number,
  ): void {
    const size = this.context.arena.size;
    const width = size * 0.23;
    const height = size * 0.19;
    const glow = 0.18 + charge * 0.18 + pulse * 0.08;

    this.graphics.fillStyle(0x481d21, glow * alpha);
    this.graphics.fillCircle(x - width * 0.22, y - height * 0.12, width * 0.31);
    this.graphics.fillCircle(x + width * 0.22, y - height * 0.12, width * 0.31);
    this.graphics.fillTriangle(x - width * 0.48, y - height * 0.03, x + width * 0.48, y - height * 0.03, x, y + height * 0.7);
    this.graphics.lineStyle(1.6, 0xef9b7b, (0.36 + charge * 0.36) * alpha);
    this.graphics.strokeCircle(x - width * 0.22, y - height * 0.12, width * 0.31);
    this.graphics.strokeCircle(x + width * 0.22, y - height * 0.12, width * 0.31);
    this.graphics.strokeTriangle(x - width * 0.48, y - height * 0.03, x + width * 0.48, y - height * 0.03, x, y + height * 0.7);

    this.graphics.lineStyle(1.1, 0xe7c08b, (0.32 + charge * 0.24) * alpha);
    this.graphics.lineBetween(x - width * 0.58, y - height * 0.7, x - width * 0.16, y - height * 0.15);
    this.graphics.lineBetween(x + width * 0.58, y - height * 0.7, x + width * 0.16, y - height * 0.15);
    this.graphics.lineBetween(x - width * 0.48, y + height * 0.55, x - width * 0.14, y + height * 0.06);
    this.graphics.lineBetween(x + width * 0.48, y + height * 0.55, x + width * 0.14, y + height * 0.06);
  }

  private drawChamberGuides(x: number, y: number, charge: number, pulse: number, alpha: number): void {
    const size = this.context.arena.size;
    const span = size * 0.42;
    const lineAlpha = (0.12 + charge * 0.16 + pulse * 0.06) * alpha;

    this.graphics.lineStyle(1, 0x76b6c8, lineAlpha);
    this.graphics.lineBetween(x - span, y, x + span, y);
    this.graphics.lineBetween(x, y - span, x, y + span);
    this.graphics.lineStyle(1.25, 0xba4d42, (0.16 + charge * 0.22) * alpha);
    this.graphics.strokeCircle(x, y, size * 0.39);
    this.graphics.lineStyle(0.8, 0xe2b56b, 0.22 * alpha);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      this.graphics.lineBetween(
        x + Math.cos(angle) * size * 0.35,
        y + Math.sin(angle) * size * 0.35,
        x + Math.cos(angle) * size * 0.43,
        y + Math.sin(angle) * size * 0.43,
      );
    }
  }

  private drawPulsePreview(
    x: number,
    y: number,
    heartPulse: HeartPulse,
    progress: number,
    alpha: number,
  ): void {
    const arena = this.context.arena;
    const radius = arena.size * heartPulse.scale;
    const warningAlpha = (0.08 + progress * 0.22) * alpha;
    this.graphics.lineStyle(1.6, 0xe45e50, warningAlpha);
    this.drawArc(x, y, radius, heartPulse.side);
    this.graphics.lineStyle(0.9, 0xf0bd82, (0.14 + progress * 0.18) * alpha);
    this.drawArc(x, y, radius * 0.92, heartPulse.side);
  }

  private drawPulseActive(
    x: number,
    y: number,
    heartPulse: HeartPulse,
    rawProgress: number,
    pulse: number,
    alpha: number,
  ): void {
    const progress = Phaser.Math.Easing.Sine.Out(Phaser.Math.Clamp(rawProgress, 0, 1));
    const arena = this.context.arena;
    const radius = Phaser.Math.Linear(arena.size * 0.065, arena.size * heartPulse.scale, progress);
    const thickness = Phaser.Math.Clamp(arena.size * 0.07, 15, 24);
    const intensity = (0.42 + pulse * 0.2) * (1 - rawProgress * 0.26) * alpha;

    this.graphics.lineStyle(thickness, 0xa5373a, intensity * 0.46);
    this.drawArc(x, y, radius, heartPulse.side);
    this.graphics.lineStyle(Math.max(1.4, thickness * 0.18), 0xffb28e, intensity);
    this.drawArc(x, y, radius, heartPulse.side);
    this.graphics.lineStyle(1, 0xffe0a8, intensity * 0.64);
    this.drawArc(x, y, Math.max(0, radius - thickness * 0.38), heartPulse.side);
  }

  private drawArc(x: number, y: number, radius: number, side: HeartPulse["side"]): void {
    const start = side === "left" ? Math.PI / 2 : side === "right" ? -Math.PI / 2 : 0;
    const end = side === "left" ? Math.PI * 1.5 : side === "right" ? Math.PI / 2 : Math.PI * 2;
    this.graphics.beginPath();
    for (let step = 0; step <= 24; step += 1) {
      const t = step / 24;
      const angle = Phaser.Math.Linear(start, end, t);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (step === 0) {
        this.graphics.moveTo(px, py);
      } else {
        this.graphics.lineTo(px, py);
      }
    }
    this.graphics.strokePath();
  }
}
