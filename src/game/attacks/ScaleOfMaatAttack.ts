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

    const fall = this.state === "summon"
      ? 0
      : this.state === "fall"
        ? Phaser.Math.Easing.Back.Out(progress)
        : 1;
    const scaleY = Phaser.Math.Linear(topY - 56, arena.y + arena.size * 0.34, fall);
    const slam = this.state === "active" ? Math.sin(this.age * 0.055) * 1.8 : 0;

    this.drawSideWarning(warningAlpha, pulse, fall);
    this.drawSplitLine(centerX, pulse, warningAlpha);
    this.drawScale(condemnedCenterX, scaleY + slam, warningAlpha, fall);

    if (this.state === "fall" || this.state === "active") {
      this.drawFallingJudgement(condemnedCenterX, scaleY, warningAlpha, fall);
    }

    if (this.state === "active") {
      this.drawImpactDust(condemnedCenterX, arena.y + arena.size * 0.52, pulse);
    }
  }

  private drawSideWarning(alpha: number, pulse: number, fall: number): void {
    const { arena } = this.context;
    const active = this.state === "active";
    const fillAlpha = active ? 0.3 + pulse * 0.05 : 0.08 + fall * 0.18 + pulse * 0.04;
    const edgeX = this.side === "left" ? this.hazardRect.x + this.hazardRect.width : this.hazardRect.x;
    const outerX = this.side === "left" ? this.hazardRect.x : this.hazardRect.x + this.hazardRect.width;

    this.graphics.fillGradientStyle(
      active ? 0x5d1618 : 0x38281a,
      active ? 0x5d1618 : 0x38281a,
      active ? 0xb84e48 : 0xf0d58a,
      active ? 0xb84e48 : 0xf0d58a,
      fillAlpha * alpha,
      fillAlpha * alpha,
      (fillAlpha + 0.08) * alpha,
      (fillAlpha + 0.08) * alpha,
    );
    this.graphics.fillRect(this.hazardRect.x, this.hazardRect.y, this.hazardRect.width, this.hazardRect.height);

    this.graphics.lineStyle(2.4, active ? 0xff8b87 : 0xf0d58a, (0.38 + pulse * 0.18) * alpha);
    this.graphics.lineBetween(outerX, arena.y + 8, outerX, arena.y + arena.size - 8);
    this.graphics.lineStyle(1.5, 0xf8f1d1, (0.26 + fall * 0.28) * alpha);
    for (let y = arena.y + 18; y < arena.y + arena.size; y += 34) {
      this.graphics.lineBetween(edgeX, y, outerX, y + (this.side === "left" ? 10 : -10));
    }

    const labelY = arena.y + 20;
    const labelX = this.side === "left"
      ? arena.x + arena.size * 0.24
      : arena.x + arena.size * 0.76;
    this.graphics.fillStyle(active ? 0xff8b87 : 0xf0d58a, (0.42 + pulse * 0.16) * alpha);
    this.graphics.fillTriangle(labelX, labelY - 7, labelX - 7, labelY + 7, labelX + 7, labelY + 7);
    this.graphics.lineStyle(1.4, 0xf8f1d1, 0.48 * alpha);
    this.graphics.strokeTriangle(labelX, labelY - 9, labelX - 9, labelY + 9, labelX + 9, labelY + 9);
  }

  private drawSplitLine(x: number, pulse: number, alpha: number): void {
    const { arena } = this.context;
    this.graphics.lineStyle(3, 0xf8f1d1, (0.3 + pulse * 0.22) * alpha);
    this.graphics.lineBetween(x, arena.y - 10, x, arena.y + arena.size + 10);
    this.graphics.lineStyle(1.2, 0x8df7ff, 0.34 * alpha);
    for (let y = arena.y + 14; y < arena.y + arena.size; y += 30) {
      this.graphics.lineBetween(x - 6, y, x + 6, y);
    }
  }

  private drawScale(x: number, y: number, alpha: number, fall: number): void {
    const tilt = this.side === "left" ? 0.28 : -0.28;
    const leftBeamY = y - 3 + tilt * 22;
    const rightBeamY = y - 3 - tilt * 22;
    const leftPanY = y + 20 + tilt * 48;
    const rightPanY = y + 20 - tilt * 48;
    const condemnedLeft = this.side === "left";
    const glow = 0.72 + fall * 0.24;

    this.drawScaleStand(x, y, alpha, glow);

    this.graphics.lineStyle(7, 0x05070c, 0.32 * alpha);
    this.graphics.lineBetween(x, y - 30, x, y + 20);
    this.graphics.lineBetween(x - 52, leftBeamY, x + 52, rightBeamY);

    this.graphics.lineStyle(4.2, 0xf0d58a, glow * alpha);
    this.graphics.lineBetween(x, y - 28, x, y + 18);
    this.graphics.lineBetween(x - 50, leftBeamY, x + 50, rightBeamY);
    this.graphics.lineStyle(2, 0xf8f1d1, 0.7 * alpha);
    this.graphics.strokeCircle(x, y - 36, 10);
    this.graphics.fillStyle(0x071018, 0.8 * alpha);
    this.graphics.fillCircle(x, y - 36, 6);

    this.graphics.lineStyle(2, 0xd8b65d, 0.76 * alpha);
    this.drawChain(x - 35, leftBeamY, x - 51, leftPanY, alpha);
    this.drawChain(x - 17, leftBeamY, x - 51, leftPanY, alpha);
    this.drawChain(x + 35, rightBeamY, x + 51, rightPanY, alpha);
    this.drawChain(x + 17, rightBeamY, x + 51, rightPanY, alpha);

    this.drawPan(x - 51, leftPanY, condemnedLeft, alpha);
    this.drawPan(x + 51, rightPanY, !condemnedLeft, alpha);
    this.drawPanIcon(x - 51, leftPanY - 9, condemnedLeft, alpha);
    this.drawPanIcon(x + 51, rightPanY - 9, !condemnedLeft, alpha);
  }

  private drawScaleStand(x: number, y: number, alpha: number, glow: number): void {
    const baseY = y + 74;

    this.graphics.fillStyle(0x02050a, 0.28 * alpha);
    this.graphics.fillEllipse(x, baseY + 5, 86, 14);

    this.graphics.lineStyle(7, 0x05070c, 0.34 * alpha);
    this.graphics.lineBetween(x, y - 22, x, baseY - 25);
    this.graphics.lineStyle(4, 0xd8b65d, 0.82 * glow * alpha);
    this.graphics.lineBetween(x, y - 24, x, baseY - 25);
    this.graphics.lineStyle(1.3, 0x8df7ff, 0.34 * alpha);
    this.graphics.lineBetween(x + 5, y - 14, x + 5, baseY - 30);

    this.graphics.fillStyle(0x071018, 0.92 * alpha);
    this.graphics.fillTriangle(x - 20, baseY - 13, x + 20, baseY - 13, x, baseY - 36);
    this.graphics.lineStyle(2, 0xd8b65d, 0.72 * alpha);
    this.graphics.strokeTriangle(x - 20, baseY - 13, x + 20, baseY - 13, x, baseY - 36);
    this.graphics.lineStyle(1, 0x8df7ff, 0.24 * alpha);
    this.graphics.lineBetween(x, baseY - 33, x, baseY - 15);

    this.graphics.fillStyle(0x10242c, 0.9 * alpha);
    this.graphics.fillRect(x - 32, baseY - 14, 64, 12);
    this.graphics.lineStyle(2, 0xf0d58a, 0.78 * alpha);
    this.graphics.strokeRect(x - 32, baseY - 14, 64, 12);
    this.graphics.fillStyle(0x05070c, 0.72 * alpha);
    this.graphics.fillEllipse(x, baseY - 2, 74, 13);
    this.graphics.lineStyle(1.5, 0xd8b65d, 0.7 * alpha);
    this.graphics.strokeEllipse(x, baseY - 2, 76, 14);

    this.graphics.fillStyle(0xd8b65d, 0.82 * alpha);
    this.graphics.fillCircle(x, y - 3, 4.8);
    this.graphics.lineStyle(1.2, 0x071018, 0.68 * alpha);
    this.graphics.strokeCircle(x, y - 3, 5.8);
  }

  private drawChain(fromX: number, fromY: number, toX: number, toY: number, alpha: number): void {
    this.graphics.lineStyle(1.7, 0xd8b65d, 0.66 * alpha);
    this.graphics.lineBetween(fromX, fromY, toX, toY);
    this.graphics.lineStyle(0.8, 0xf8f1d1, 0.32 * alpha);
    const steps = 3;
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      const x = Phaser.Math.Linear(fromX, toX, t);
      const y = Phaser.Math.Linear(fromY, toY, t);
      this.graphics.strokeCircle(x, y, 1.8);
    }
  }

  private drawPan(x: number, y: number, condemned: boolean, alpha: number): void {
    this.graphics.fillStyle(condemned ? 0x7d2528 : 0x10242c, (condemned ? 0.9 : 0.82) * alpha);
    this.graphics.fillEllipse(x, y, 52, 13);
    this.graphics.lineStyle(2, 0xf0d58a, 0.76 * alpha);
    this.graphics.strokeEllipse(x, y, 54, 15);
    if (condemned) {
      this.graphics.fillStyle(0xe96868, 0.7 * alpha);
      this.graphics.fillEllipse(x, y - 1, 34, 7);
    } else {
      this.graphics.fillStyle(0x8df7ff, 0.16 * alpha);
      this.graphics.fillEllipse(x, y - 1, 36, 7);
    }
  }

  private drawPanIcon(x: number, y: number, condemned: boolean, alpha: number): void {
    if (condemned) {
      this.graphics.fillStyle(0xff8b87, 0.92 * alpha);
      this.graphics.fillRect(x - 8, y - 6, 16, 12);
      this.graphics.lineStyle(1.4, 0xf8f1d1, 0.56 * alpha);
      this.graphics.strokeRect(x - 8, y - 6, 16, 12);
      return;
    }

    this.graphics.fillStyle(0xf8f1d1, 0.88 * alpha);
    this.graphics.fillEllipse(x, y, 9, 22);
    this.graphics.lineStyle(1.2, 0x8df7ff, 0.58 * alpha);
    this.graphics.lineBetween(x, y - 9, x, y + 9);
  }

  private drawFallingJudgement(x: number, y: number, alpha: number, fall: number): void {
    const { arena } = this.context;
    const width = this.hazardRect.width * 0.82;
    const left = x - width / 2;
    const top = Phaser.Math.Clamp(y + 42, arena.y + 16, arena.y + arena.size - 28);
    const bottom = arena.y + arena.size - 12;
    const beamAlpha = this.state === "active" ? 0.18 : 0.08 + fall * 0.18;

    this.graphics.fillStyle(0xf0d58a, beamAlpha * alpha);
    this.graphics.fillRect(left, top, width, Math.max(0, bottom - top));
    this.graphics.lineStyle(1.4, 0xf8f1d1, (0.18 + fall * 0.22) * alpha);
    this.graphics.lineBetween(left, top, left, bottom);
    this.graphics.lineBetween(left + width, top, left + width, bottom);
    this.graphics.lineStyle(2, 0xff8b87, (0.24 + fall * 0.32) * alpha);
    this.graphics.lineBetween(left + 8, bottom, left + width - 8, bottom);
  }

  private drawImpactDust(x: number, y: number, pulse: number): void {
    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12 + this.age * 0.002;
      const distance = 16 + ((this.age * 0.05 + index * 7) % 34);
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance * 0.34;
      this.graphics.fillStyle(index % 2 === 0 ? 0xf0d58a : 0xff8b87, (0.1 + pulse * 0.12) * (1 - index * 0.035));
      this.graphics.fillCircle(px, py, 2.2);
    }
  }
}
