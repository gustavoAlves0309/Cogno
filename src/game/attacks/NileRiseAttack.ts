import Phaser from "phaser";
import { circleIntersectsRect } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

export class NileRiseAttack implements Attack {
  readonly name = "Nilo Ascendente";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private readonly targetY: number;
  private readonly bandHeight = 52;
  private readonly telegraphMs = 900;
  private readonly riseMs = 1300;
  private readonly holdMs = 900;
  private currentRect = new Phaser.Geom.Rectangle();
  private active = false;

  constructor(context: AttackContext, time: number, targetY?: number) {
    this.context = context;
    this.createdAt = time;
    this.targetY = targetY ?? context.arena.y + context.arena.size * Phaser.Math.FloatBetween(0.32, 0.76);
    this.graphics = context.scene.add.graphics().setDepth(25);
  }

  update(time: number): void {
    const age = time - this.createdAt;
    const riseProgress = Phaser.Math.Clamp((age - this.telegraphMs) / this.riseMs, 0, 1);
    const eased = Phaser.Math.Easing.Cubic.Out(riseProgress);
    const y = Phaser.Math.Linear(this.context.stageHeight + this.bandHeight, this.targetY, eased);

    this.active = age >= this.telegraphMs + 220 && age <= this.telegraphMs + this.riseMs + this.holdMs;
    this.currentRect.setTo(-20, y - this.bandHeight / 2, this.context.stageWidth + 40, this.bandHeight);
    this.draw(age, y);
  }

  collides(player: PlayerState): boolean {
    return this.active && circleIntersectsRect(player.position, player.radius, this.currentRect);
  }

  isFinished(): boolean {
    return this.context.scene.time.now - this.createdAt > this.telegraphMs + this.riseMs + this.holdMs + 450;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(age: number, y: number): void {
    this.graphics.clear();

    const telegraphAlpha = age < this.telegraphMs ? 0.25 + Math.sin(age * 0.025) * 0.12 : 0.16;
    this.graphics.fillStyle(0x35c8d7, telegraphAlpha);
    this.graphics.fillRect(this.context.arena.x, this.targetY - this.bandHeight / 2, this.context.arena.size, this.bandHeight);
    this.graphics.lineStyle(2, 0x7af3ff, telegraphAlpha + 0.25);
    this.graphics.strokeRect(this.context.arena.x, this.targetY - this.bandHeight / 2, this.context.arena.size, this.bandHeight);

    if (age >= this.telegraphMs) {
      this.graphics.fillStyle(0x1b718c, 0.62);
      this.graphics.fillRect(-20, y - this.bandHeight / 2, this.context.stageWidth + 40, this.bandHeight);
      this.graphics.fillStyle(0x61e7f6, 0.22);
      this.graphics.fillRect(-20, y - this.bandHeight / 2, this.context.stageWidth + 40, 12);
      this.graphics.lineStyle(2, 0x8df7ff, 0.72);
      this.graphics.lineBetween(-20, y - this.bandHeight / 2, this.context.stageWidth + 20, y - this.bandHeight / 2);
    }
  }
}
