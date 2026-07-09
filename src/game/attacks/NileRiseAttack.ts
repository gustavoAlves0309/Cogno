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
    const previewTop = Phaser.Math.Linear(arenaBottom, this.targetY, Phaser.Math.Easing.Sine.InOut(charge));
    const pulse = 0.5 + Math.sin(age * 0.02) * 0.5;

    this.graphics.fillStyle(0x35c8d7, 0.16 + pulse * 0.07);
    this.graphics.fillRect(arena.x, this.targetY, arena.size, arenaBottom - this.targetY);
    this.graphics.fillStyle(0x35c8d7, 0.2);
    this.graphics.fillRect(arena.x, previewTop, arena.size, arenaBottom - previewTop);

    this.graphics.lineStyle(4, 0x8df7ff, 0.78 + pulse * 0.18);
    this.graphics.lineBetween(arena.x - 10, this.targetY, arena.x + arena.size + 10, this.targetY);
    this.graphics.lineStyle(2, 0xe8ca7f, 0.68);
    for (let x = arena.x + 18; x < arena.x + arena.size; x += 34) {
      this.graphics.lineBetween(x - 8, this.targetY - 9, x, this.targetY);
      this.graphics.lineBetween(x, this.targetY, x + 8, this.targetY - 9);
    }

    if (age >= this.telegraphMs) {
      this.graphics.fillStyle(0x105a73, 0.72);
      this.graphics.fillRect(-20, y, this.context.stageWidth + 40, this.context.stageHeight - y + 20);
      this.graphics.fillStyle(0x1491ad, 0.82);
      this.graphics.fillRect(arena.x, Math.max(y, arena.y), arena.size, arenaBottom - Math.max(y, arena.y));
      this.graphics.fillStyle(0x61e7f6, 0.18);
      this.graphics.fillRect(-20, y, this.context.stageWidth + 40, 18);
      this.graphics.lineStyle(4, 0x8df7ff, 0.68);
      this.drawWaveLine(y, age, 0);
      this.graphics.lineStyle(2, 0xf3d37b, 0.38);
      this.drawWaveLine(y + 12, age, 1.7);

      for (let wave = y + 34; wave < this.context.stageHeight; wave += 28) {
        this.graphics.lineStyle(1, 0x8df7ff, 0.14);
        this.drawWaveLine(wave, age, wave * 0.03);
      }
    }
  }

  private drawWaveLine(y: number, age: number, phase: number): void {
    this.graphics.beginPath();
    for (let x = -20; x <= this.context.stageWidth + 24; x += 12) {
      const waveY = y + Math.sin(x * 0.055 + age * 0.012 + phase) * 4;
      if (x === -20) {
        this.graphics.moveTo(x, waveY);
      } else {
        this.graphics.lineTo(x, waveY);
      }
    }
    this.graphics.strokePath();
  }
}
