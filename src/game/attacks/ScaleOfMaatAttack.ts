import Phaser from "phaser";
import { circleIntersectsRect } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

type MaatSide = "left" | "right";
type MaatState = "summon" | "fall" | "active" | "fade";

export class ScaleOfMaatAttack implements Attack {
  readonly name = "Scale of Ma'at";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly side: MaatSide;
  private readonly summonMs = 820;
  private readonly fallMs = 420;
  private readonly activeMs = 1420;
  private readonly fadeMs = 420;
  private readonly hazardRect = new Phaser.Geom.Rectangle();
  private startedAt: number | null = null;
  private state: MaatState = "summon";
  private age = 0;

  constructor(context: AttackContext, _time: number, side?: MaatSide) {
    this.context = context;
    this.side = side ?? (Math.random() > 0.5 ? "left" : "right");
    this.graphics = context.scene.add.graphics().setDepth(57);
    this.updateHazardRect();
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    this.age = time - this.startedAt;
    this.state = this.getState(this.age);
    this.updateHazardRect();
    this.draw();
  }

  collides(player: PlayerState): boolean {
    return this.state === "active" && circleIntersectsRect(player.position, player.radius, this.hazardRect);
  }

  isFinished(): boolean {
    return this.age > this.summonMs + this.fallMs + this.activeMs + this.fadeMs;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private updateHazardRect(): void {
    const { arena } = this.context;
    const centerX = arena.x + arena.size / 2;

    if (this.side === "left") {
      this.hazardRect.setTo(arena.x, arena.y, centerX - arena.x, arena.size);
    } else {
      this.hazardRect.setTo(centerX, arena.y, arena.x + arena.size - centerX, arena.size);
    }
  }

  private getState(age: number): MaatState {
    if (age < this.summonMs) {
      return "summon";
    }

    if (age < this.summonMs + this.fallMs) {
      return "fall";
    }

    if (age < this.summonMs + this.fallMs + this.activeMs) {
      return "active";
    }

    return "fade";
  }

  private stateProgress(): number {
    const starts: Record<MaatState, number> = {
      summon: 0,
      fall: this.summonMs,
      active: this.summonMs + this.fallMs,
      fade: this.summonMs + this.fallMs + this.activeMs,
    };
    const durations: Record<MaatState, number> = {
      summon: this.summonMs,
      fall: this.fallMs,
      active: this.activeMs,
      fade: this.fadeMs,
    };

    return Phaser.Math.Clamp((this.age - starts[this.state]) / durations[this.state], 0, 1);
  }

  private draw(): void {
    this.graphics.clear();

    const { arena } = this.context;
    const progress = this.stateProgress();
    const centerX = arena.x + arena.size / 2;
    const condemnedCenterX = this.side === "left"
      ? arena.x + arena.size * 0.25
      : arena.x + arena.size * 0.75;
    const topY = arena.y - 24;
    const pulse = 0.5 + Math.sin(this.age * 0.023) * 0.5;
    const warningAlpha = this.state === "fade" ? 1 - progress : 1;

    this.drawSideWarning(warningAlpha, pulse);
    this.drawSplitLine(centerX, pulse, warningAlpha);

    const fall = this.state === "summon"
      ? 0
      : this.state === "fall"
        ? Phaser.Math.Easing.Back.Out(progress)
        : 1;
    const scaleY = Phaser.Math.Linear(topY - 56, arena.y + arena.size * 0.34, fall);
    const slam = this.state === "active" ? Math.sin(this.age * 0.055) * 1.8 : 0;
    this.drawScale(condemnedCenterX, scaleY + slam, warningAlpha);

    if (this.state === "fall" || this.state === "active") {
      this.drawFallingBeam(condemnedCenterX, scaleY, warningAlpha);
    }

    if (this.state === "active") {
      this.drawImpactDust(condemnedCenterX, arena.y + arena.size * 0.5, pulse);
    }
  }

  private drawSideWarning(alpha: number, pulse: number): void {
    const hazardAlpha = this.state === "active" ? 0.5 + pulse * 0.08 : 0.26 + pulse * 0.1;

    this.graphics.fillStyle(this.state === "active" ? 0xb84e48 : 0xe8ca7f, hazardAlpha * alpha);
    this.graphics.fillRect(this.hazardRect.x, this.hazardRect.y, this.hazardRect.width, this.hazardRect.height);
  }

  private drawSplitLine(x: number, pulse: number, alpha: number): void {
    const { arena } = this.context;
    this.graphics.lineStyle(4, 0xf8f1d1, (0.44 + pulse * 0.32) * alpha);
    this.graphics.lineBetween(x, arena.y - 10, x, arena.y + arena.size + 10);
    this.graphics.lineStyle(1.6, 0x8df7ff, 0.5 * alpha);
    for (let y = arena.y + 14; y < arena.y + arena.size; y += 30) {
      this.graphics.lineBetween(x - 8, y, x + 8, y);
    }
  }

  private drawScale(x: number, y: number, alpha: number): void {
    const tilt = this.side === "left" ? 0.18 : -0.18;
    const leftBeamY = y - 3 + tilt * 18;
    const rightBeamY = y - 3 - tilt * 18;
    const leftPanY = y + 18 + tilt * 42;
    const rightPanY = y + 18 - tilt * 42;

    this.graphics.lineStyle(5, 0xf0d58a, 0.96 * alpha);
    this.graphics.lineBetween(x, y - 28, x, y + 18);
    this.graphics.lineBetween(x - 46, leftBeamY, x + 46, rightBeamY);
    this.graphics.lineStyle(2, 0xf8f1d1, 0.7 * alpha);
    this.graphics.strokeCircle(x, y - 36, 10);
    this.graphics.fillStyle(0x071018, 0.8 * alpha);
    this.graphics.fillCircle(x, y - 36, 6);

    this.graphics.lineStyle(2, 0xd8b65d, 0.76 * alpha);
    this.graphics.lineBetween(x - 34, leftBeamY, x - 49, leftPanY);
    this.graphics.lineBetween(x - 18, leftBeamY, x - 49, leftPanY);
    this.graphics.lineBetween(x + 34, rightBeamY, x + 49, rightPanY);
    this.graphics.lineBetween(x + 18, rightBeamY, x + 49, rightPanY);

    this.graphics.fillStyle(this.side === "left" ? 0xe96868 : 0x26313a, 0.86 * alpha);
    this.graphics.fillEllipse(x - 49, leftPanY, 46, 12);
    this.graphics.fillStyle(this.side === "right" ? 0xe96868 : 0x26313a, 0.86 * alpha);
    this.graphics.fillEllipse(x + 49, rightPanY, 46, 12);
    this.graphics.lineStyle(2, 0xf0d58a, 0.76 * alpha);
    this.graphics.strokeEllipse(x - 49, leftPanY, 48, 14);
    this.graphics.strokeEllipse(x + 49, rightPanY, 48, 14);
  }

  private drawFallingBeam(x: number, y: number, alpha: number): void {
    const { arena } = this.context;
    this.graphics.lineStyle(2, 0xf8f1d1, 0.22 * alpha);
    this.graphics.lineBetween(x, y + 28, x, arena.y + arena.size);
    this.graphics.fillStyle(0xf0d58a, 0.18 * alpha);
    this.graphics.fillTriangle(x - 14, y + 32, x + 14, y + 32, x, arena.y + arena.size);
  }

  private drawImpactDust(x: number, y: number, pulse: number): void {
    for (let index = 0; index < 10; index += 1) {
      const angle = (Math.PI * 2 * index) / 10 + this.age * 0.002;
      const distance = 18 + ((this.age * 0.05 + index * 7) % 36);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance * 0.34;
      this.graphics.fillStyle(index % 2 === 0 ? 0xf0d58a : 0xff8b87, (0.12 + pulse * 0.14) * (1 - index * 0.04));
      this.graphics.fillCircle(px, py, 2.4);
    }
  }
}
