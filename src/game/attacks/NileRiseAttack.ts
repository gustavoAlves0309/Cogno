import Phaser from "phaser";
import { circleIntersectsRect } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

export class NileRiseAttack implements Attack {
  readonly name = "Rising Nile";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private startedAt: number | null = null;
  private readonly targetY: number;
  private readonly telegraphMs = 1100;
  private readonly riseMs = 1450;
  private readonly holdMs = 1050;
  private currentRect = new Phaser.Geom.Rectangle();
  private active = false;
  private age = 0;

  constructor(context: AttackContext, time: number, targetY?: number) {
    this.context = context;
    this.createdAt = time;
    const chosenTarget = targetY ?? context.arena.y + context.arena.size * Phaser.Math.FloatBetween(0.32, 0.76);
    this.targetY = Phaser.Math.Clamp(
      chosenTarget,
      context.arena.y + context.arena.size * 0.26,
      context.arena.y + context.arena.size * 0.78,
    );
    this.graphics = context.scene.add.graphics().setDepth(42);
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    const age = time - this.startedAt;
    this.age = age;
    const riseProgress = Phaser.Math.Clamp((age - this.telegraphMs) / this.riseMs, 0, 1);
    const eased = Phaser.Math.Easing.Cubic.Out(riseProgress);
    const arenaBottom = this.context.arena.y + this.context.arena.size;
    const waterTop = Phaser.Math.Linear(arenaBottom + 32, this.targetY, eased);

    this.active = age >= this.telegraphMs + 120 && age <= this.telegraphMs + this.riseMs + this.holdMs;
    this.currentRect.setTo(
      this.context.arena.x,
      waterTop,
      this.context.arena.size,
      Math.max(0, arenaBottom - waterTop),
    );
    this.draw(age, waterTop);
  }

  collides(player: PlayerState): boolean {
    return this.active && circleIntersectsRect(player.position, player.radius, this.currentRect);
  }

  isFinished(): boolean {
    return this.age > this.telegraphMs + this.riseMs + this.holdMs + 450;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(age: number, y: number): void {
    this.graphics.clear();

    const { arena } = this.context;
    const arenaBottom = arena.y + arena.size;
    const charge = Phaser.Math.Clamp(age / this.telegraphMs, 0, 1);
    const pulse = 0.5 + Math.sin(age * 0.02) * 0.5;
    const previewTop = Phaser.Math.Linear(arenaBottom, this.targetY, Phaser.Math.Easing.Sine.InOut(charge));

    this.drawFloodWarning(age, previewTop, charge, pulse);

    if (age >= this.telegraphMs) {
      this.drawActiveFlood(age, y, pulse);
    }
  }

  private drawFloodWarning(age: number, previewTop: number, charge: number, pulse: number): void {
    const { arena } = this.context;
    const arenaBottom = arena.y + arena.size;
    const previewHeight = Math.max(0, arenaBottom - previewTop);
    const finalHeight = Math.max(0, arenaBottom - this.targetY);
    const shimmer = 0.45 + pulse * 0.3;

    this.graphics.fillStyle(0x35d6cb, 0.07 + charge * 0.04);
    this.graphics.fillRect(arena.x, this.targetY, arena.size, finalHeight);
    this.graphics.fillGradientStyle(0x0b3448, 0x0b3448, 0x1491ad, 0x1491ad, 0.1 + charge * 0.12, 0.1 + charge * 0.12, 0.28 + charge * 0.18, 0.28 + charge * 0.18);
    this.graphics.fillRect(arena.x, previewTop, arena.size, previewHeight);

    this.graphics.lineStyle(2, 0x8df7ff, 0.16 + charge * 0.34);
    for (let wave = arenaBottom - 18; wave > previewTop + 12; wave -= 24) {
      this.drawWaveLine(wave, age, wave * 0.025, arena.x, arena.x + arena.size, 2.2);
    }

    this.graphics.lineStyle(4, 0x8df7ff, 0.54 + shimmer * 0.28);
    this.drawWaveLine(previewTop, age, 0.6, arena.x - 8, arena.x + arena.size + 8, 3.2);
    this.graphics.lineStyle(2, 0xf0d58a, 0.5 + pulse * 0.16);
    this.drawWaveLine(this.targetY, age, 2.4, arena.x - 12, arena.x + arena.size + 12, 2.4);

    this.drawNilometerMarks(charge, pulse);
    this.drawFloodParticles(age, previewTop, charge, false);
  }

  private drawActiveFlood(age: number, y: number, pulse: number): void {
    const { arena } = this.context;
    const arenaBottom = arena.y + arena.size;
    const top = Math.max(y, arena.y);

    this.graphics.fillGradientStyle(0x0a2b3c, 0x0a2b3c, 0x1491ad, 0x1491ad, 0.64, 0.64, 0.9, 0.9);
    this.graphics.fillRect(-20, y, this.context.stageWidth + 40, this.context.stageHeight - y + 20);
    this.graphics.fillGradientStyle(0x105a73, 0x105a73, 0x1ba5bd, 0x1ba5bd, 0.84, 0.84, 0.95, 0.95);
    this.graphics.fillRect(arena.x, top, arena.size, arenaBottom - top);

    this.graphics.fillStyle(0x61e7f6, 0.12 + pulse * 0.08);
    this.graphics.fillRect(arena.x, top, arena.size, Math.min(26, arenaBottom - top));
    this.graphics.lineStyle(5, 0x8df7ff, 0.58 + pulse * 0.16);
    this.drawWaveLine(y, age, 0, arena.x - 16, arena.x + arena.size + 16, 4.4);
    this.graphics.lineStyle(2, 0xf3d37b, 0.36);
    this.drawWaveLine(y + 13, age, 1.7, arena.x - 12, arena.x + arena.size + 12, 2.8);

    for (let wave = top + 34; wave < arenaBottom; wave += 28) {
      this.graphics.lineStyle(1, 0x8df7ff, 0.13);
      this.drawWaveLine(wave, age, wave * 0.03, arena.x, arena.x + arena.size, 2.8);
    }

    this.drawFloodParticles(age, top, 1, true);
  }

  private drawNilometerMarks(charge: number, pulse: number): void {
    const { arena } = this.context;
    const leftX = arena.x - 10;
    const rightX = arena.x + arena.size + 10;
    const bottom = arena.y + arena.size;

    this.graphics.lineStyle(1.6, 0xf0d58a, 0.36 + charge * 0.3);
    this.graphics.lineBetween(leftX, this.targetY, leftX, bottom);
    this.graphics.lineBetween(rightX, this.targetY, rightX, bottom);

    for (let y = bottom; y >= this.targetY - 2; y -= 18) {
      const major = Math.round((bottom - y) / 18) % 3 === 0;
      const width = major ? 12 : 7;
      const alpha = major ? 0.54 : 0.36;
      this.graphics.lineStyle(major ? 1.8 : 1.2, major ? 0xf0d58a : 0x8df7ff, alpha + pulse * 0.08);
      this.graphics.lineBetween(leftX, y, leftX + width, y);
      this.graphics.lineBetween(rightX, y, rightX - width, y);
    }
  }

  private drawFloodParticles(age: number, waterTop: number, charge: number, active: boolean): void {
    const { arena } = this.context;
    const bottom = arena.y + arena.size;
    const count = active ? 18 : 12;

    for (let index = 0; index < count; index += 1) {
      const lane = (index + 0.5) / count;
      const x = Phaser.Math.Linear(arena.x + 12, arena.x + arena.size - 12, lane)
        + Math.sin(age * 0.01 + index * 1.8) * 4;
      const drift = (age * (active ? 0.00036 : 0.00022) + index * 0.137) % 1;
      const y = Phaser.Math.Linear(bottom - 8, waterTop + 8, drift);
      const alpha = (active ? 0.42 : 0.24) * charge * (1 - drift * 0.45);
      const radius = (active ? 1.8 : 1.3) + Math.sin(age * 0.015 + index) * 0.45;
      const color = index % 3 === 0 ? 0xf0d58a : 0x8df7ff;

      this.graphics.fillStyle(color, alpha);
      this.graphics.fillCircle(x, y, Math.max(0.8, radius));
    }
  }

  private drawWaveLine(
    y: number,
    age: number,
    phase: number,
    startX = -20,
    endX = this.context.stageWidth + 24,
    amplitude = 4,
  ): void {
    this.graphics.beginPath();
    for (let x = startX; x <= endX; x += 12) {
      const waveY = y + Math.sin(x * 0.055 + age * 0.012 + phase) * amplitude;
      if (x === startX) {
        this.graphics.moveTo(x, waveY);
      } else {
        this.graphics.lineTo(x, waveY);
      }
    }
    this.graphics.strokePath();
  }
}
