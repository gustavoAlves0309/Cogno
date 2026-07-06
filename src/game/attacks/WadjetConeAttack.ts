import Phaser from "phaser";
import { pointInTriangle } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

export class WadjetConeAttack implements Attack {
  readonly name = "Wadjet Lateral";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private readonly side: "left" | "right";
  private readonly telegraphMs = 850;
  private readonly activeMs = 650;
  private readonly triangle: Phaser.Geom.Triangle;
  private active = false;

  constructor(context: AttackContext, time: number, side?: "left" | "right") {
    this.context = context;
    this.createdAt = time;
    this.side = side ?? (Math.random() > 0.5 ? "left" : "right");
    this.graphics = context.scene.add.graphics().setDepth(30);
    this.triangle = this.createTriangle();
  }

  update(time: number): void {
    const age = time - this.createdAt;
    this.active = age >= this.telegraphMs && age <= this.telegraphMs + this.activeMs;
    this.draw(age);
  }

  collides(player: PlayerState): boolean {
    return this.active && pointInTriangle(player.position, this.triangle);
  }

  isFinished(): boolean {
    return this.context.scene.time.now - this.createdAt > this.telegraphMs + this.activeMs + 420;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private createTriangle(): Phaser.Geom.Triangle {
    const { arena } = this.context;
    const centerY = arena.y + arena.size * Phaser.Math.FloatBetween(0.36, 0.64);
    const spread = arena.size * 0.55;

    if (this.side === "left") {
      return new Phaser.Geom.Triangle(-16, centerY, arena.x + arena.size * 0.74, centerY - spread / 2, arena.x + arena.size * 0.74, centerY + spread / 2);
    }

    return new Phaser.Geom.Triangle(
      this.context.stageWidth + 16,
      centerY,
      arena.x + arena.size * 0.26,
      centerY - spread / 2,
      arena.x + arena.size * 0.26,
      centerY + spread / 2,
    );
  }

  private draw(age: number): void {
    this.graphics.clear();

    const sourceX = this.side === "left" ? 26 : this.context.stageWidth - 26;
    const sourceY = this.triangle.y1;
    const cobraAlpha = 0.48 + Math.sin(age * 0.025) * 0.18;

    this.graphics.fillStyle(0x50cc78, cobraAlpha);
    this.graphics.fillCircle(sourceX, sourceY, 18);
    this.graphics.lineStyle(2, 0xc5f6ab, cobraAlpha);
    this.graphics.strokeCircle(sourceX, sourceY, 24);

    if (this.active) {
      this.graphics.fillStyle(0x4fd47a, 0.38);
      this.graphics.lineStyle(3, 0xbdf7a8, 0.85);
    } else {
      this.graphics.fillStyle(0x4fd47a, 0.12 + Math.sin(age * 0.02) * 0.05);
      this.graphics.lineStyle(2, 0xbdf7a8, 0.42);
    }

    this.graphics.beginPath();
    this.graphics.moveTo(this.triangle.x1, this.triangle.y1);
    this.graphics.lineTo(this.triangle.x2, this.triangle.y2);
    this.graphics.lineTo(this.triangle.x3, this.triangle.y3);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();
  }
}
