import Phaser from "phaser";
import { circleIntersectsRect } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";
import type { LeonardoStudyVersion } from "./LeonardoValvulaCoracaoAttack";

interface SfumatoPulse {
  start: number;
  activeMs: number;
  safe: "left" | "center" | "right";
}

export class LeonardoSfumatoAttack implements Attack {
  readonly name = "Sfumato";

  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly pulses: readonly SfumatoPulse[];
  private readonly telegraphMs = 1250;
  private readonly fadeMs = 520;
  private readonly hazards: Phaser.Geom.Rectangle[] = [];
  private startedAt: number | null = null;
  private age = 0;

  constructor(
    private readonly context: AttackContext,
    _time: number,
    readonly version: LeonardoStudyVersion,
  ) {
    this.graphics = context.scene.add.graphics().setDepth(41);
    this.pulses = version === 3
      ? [
          { start: 0, activeMs: 1160, safe: "right" },
          { start: 1840, activeMs: 1160, safe: "left" },
        ]
      : [{ start: 0, activeMs: 1780, safe: version === 1 ? "right" : "center" }];
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    this.age = time - this.startedAt;
    this.updateHazards();
    this.draw();
  }

  collides(player: PlayerState): boolean {
    return this.hazards.some((hazard) => circleIntersectsRect(player.position, player.radius, hazard));
  }

  isFinished(): boolean {
    const last = this.pulses[this.pulses.length - 1];
    return this.age > this.telegraphMs + last.start + last.activeMs + this.fadeMs;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private updateHazards(): void {
    this.hazards.length = 0;
    if (this.age < this.telegraphMs) {
      return;
    }

    const activeAge = this.age - this.telegraphMs;
    for (const pulse of this.pulses) {
      const local = activeAge - pulse.start;
      if (local < 0 || local > pulse.activeMs) {
        continue;
      }

      this.hazards.push(...this.getHazardsForSafe(pulse.safe));
    }
  }

  private getHazardsForSafe(safe: SfumatoPulse["safe"]): Phaser.Geom.Rectangle[] {
    const { arena } = this.context;
    const safeWidth = safe === "center" ? arena.size * 0.34 : arena.size * 0.36;
    const safeLeft = safe === "left"
      ? arena.x
      : safe === "right"
        ? arena.x + arena.size - safeWidth
        : arena.x + (arena.size - safeWidth) / 2;
    const safeRight = safeLeft + safeWidth;
    const hazards: Phaser.Geom.Rectangle[] = [];

    if (safeLeft > arena.x) {
      hazards.push(new Phaser.Geom.Rectangle(arena.x, arena.y, safeLeft - arena.x, arena.size));
    }
    if (safeRight < arena.x + arena.size) {
      hazards.push(new Phaser.Geom.Rectangle(safeRight, arena.y, arena.x + arena.size - safeRight, arena.size));
    }
    return hazards;
  }

  private draw(): void {
    this.graphics.clear();

    const activeAge = Math.max(0, this.age - this.telegraphMs);
    const charge = Phaser.Math.Clamp(this.age / this.telegraphMs, 0, 1);
    const pulse = 0.5 + Math.sin(this.age * 0.014) * 0.5;
    const last = this.pulses[this.pulses.length - 1];
    const fadeStart = this.telegraphMs + last.start + last.activeMs;
    const fade = Phaser.Math.Clamp((this.age - fadeStart) / this.fadeMs, 0, 1);
    const alpha = 1 - fade;

    this.drawStudyFrame(charge, pulse, alpha);
    if (this.age < this.telegraphMs) {
      this.drawVeil(this.pulses[0].safe, false, charge, pulse, alpha);
      return;
    }

    for (const sfumatoPulse of this.pulses) {
      const local = activeAge - sfumatoPulse.start;
      const previewStart = sfumatoPulse.start - (sfumatoPulse.start > 0 ? 560 : this.telegraphMs);
      const previewProgress = Phaser.Math.Clamp((activeAge - previewStart) / (sfumatoPulse.start > 0 ? 560 : this.telegraphMs), 0, 1);
      if (local < 0) {
        if (previewProgress > 0) {
          this.drawVeil(sfumatoPulse.safe, false, previewProgress, pulse, alpha);
        }
        continue;
      }
      if (local <= sfumatoPulse.activeMs) {
        this.drawVeil(sfumatoPulse.safe, true, local / sfumatoPulse.activeMs, pulse, alpha);
      }
    }

    if (this.version === 3 && activeAge >= 1160 && activeAge < 1840) {
      const correction = Phaser.Math.Clamp((activeAge - 1160) / 680, 0, 1);
      this.drawCorrectionMark(correction, alpha);
    }
  }

  private drawStudyFrame(charge: number, pulse: number, alpha: number): void {
    const { arena } = this.context;
    const centerX = arena.x + arena.size / 2;
    const centerY = arena.y + arena.size / 2;
    this.graphics.fillStyle(0xd8b06a, (0.025 + charge * 0.035) * alpha);
    this.graphics.fillRect(arena.x, arena.y, arena.size, arena.size);
    this.graphics.lineStyle(1.1, 0x6aa3b8, (0.14 + charge * 0.16) * alpha);
    this.graphics.lineBetween(centerX, arena.y - 8, centerX, arena.y + arena.size + 8);
    this.graphics.lineStyle(1, 0x8f3f35, (0.12 + pulse * 0.08) * alpha);
    for (let index = 0; index < 5; index += 1) {
      const offset = (index - 2) * arena.size * 0.11;
      this.graphics.lineBetween(centerX + offset, arena.y + 8, centerX + offset * 0.28, arena.y + arena.size - 8);
    }
    this.graphics.fillStyle(0xeee0bd, (0.08 + charge * 0.1) * alpha);
    this.graphics.fillCircle(centerX, centerY, arena.size * 0.08);
  }

  private drawVeil(
    safe: SfumatoPulse["safe"],
    active: boolean,
    progress: number,
    pulse: number,
    alpha: number,
  ): void {
    const { arena } = this.context;
    const safeWidth = safe === "center" ? arena.size * 0.34 : arena.size * 0.36;
    const safeLeft = safe === "left"
      ? arena.x
      : safe === "right"
        ? arena.x + arena.size - safeWidth
        : arena.x + (arena.size - safeWidth) / 2;
    const safeRight = safeLeft + safeWidth;
    const veilAlpha = (active ? 0.38 + pulse * 0.08 : 0.08 + progress * 0.16) * alpha;
    const lightAlpha = (active ? 0.44 + pulse * 0.12 : 0.2 + progress * 0.18) * alpha;

    this.graphics.fillStyle(0x171319, veilAlpha);
    if (safeLeft > arena.x) {
      this.graphics.fillRect(arena.x, arena.y, safeLeft - arena.x, arena.size);
    }
    if (safeRight < arena.x + arena.size) {
      this.graphics.fillRect(safeRight, arena.y, arena.x + arena.size - safeRight, arena.size);
    }
    this.graphics.fillStyle(0xf0d79a, lightAlpha * 0.16);
    this.graphics.fillRect(safeLeft, arena.y, safeWidth, arena.size);
    this.graphics.lineStyle(active ? 2.8 : 1.6, active ? 0xffe8ab : 0xe45848, lightAlpha);
    this.graphics.lineBetween(safeLeft, arena.y + 6, safeLeft, arena.y + arena.size - 6);
    this.graphics.lineBetween(safeRight, arena.y + 6, safeRight, arena.y + arena.size - 6);
    this.graphics.lineStyle(1, 0x75bdd0, lightAlpha * 0.62);
    for (let y = arena.y + 18; y < arena.y + arena.size; y += 28) {
      this.graphics.lineBetween(safeLeft + 4, y, safeRight - 4, y);
    }
  }

  private drawCorrectionMark(progress: number, alpha: number): void {
    const { arena } = this.context;
    const x = arena.x + arena.size / 2;
    const y = arena.y + arena.size * 0.16;
    const width = arena.size * (0.12 + progress * 0.18);
    this.graphics.lineStyle(2.4, 0xd45848, (0.46 + progress * 0.34) * alpha);
    this.graphics.lineBetween(x - width, y - 8, x + width, y + 8);
    this.graphics.lineBetween(x - width, y + 8, x + width, y - 8);
    this.graphics.fillStyle(0xd45848, (0.34 + progress * 0.28) * alpha);
    this.graphics.fillCircle(x, y, 3.2);
  }
}
