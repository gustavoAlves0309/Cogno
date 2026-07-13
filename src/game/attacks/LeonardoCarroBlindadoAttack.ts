import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

export type LeonardoCarroBlindadoVersion = 1 | 2 | 3;

type CarroState = "sketch" | "telegraph" | "active" | "revision" | "fade";

interface CarroPulse {
  from: number;
  to: number;
  progress: number;
  barrel: 0 | 1;
}

interface FanRay {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  angle: number;
  barrel: 0 | 1;
}

const SKETCH_MS = 900;
const TELEGRAPH_MS = 1500;
const REVISION_MS = 950;
const FADE_MS = 350;
const ACTIVE_MS: Record<LeonardoCarroBlindadoVersion, number> = {
  1: 4300,
  2: 5300,
  3: 4800,
};
const FAN_OFFSETS = [-0.46, -0.15, 0.15, 0.46] as const;

export const LEONARDO_CARRO_BLINDADO_DURATION_MS: Record<LeonardoCarroBlindadoVersion, number> = {
  1: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[1] + REVISION_MS + FADE_MS,
  2: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[2] + REVISION_MS + FADE_MS,
  3: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[3] + REVISION_MS + FADE_MS,
};

/**
 * An authored, non-targeting fan attack. Every active ray is derived from the
 * same sweep that is displayed during telegraph, so the player never receives
 * a geometry change based on their current position.
 */
export class LeonardoCarroBlindadoAttack implements Attack {
  readonly name = "Carro Blindado";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly version: LeonardoCarroBlindadoVersion;
  private readonly startedAt: number;
  private age = 0;
  private state: CarroState = "sketch";

  constructor(context: AttackContext, time: number, version: LeonardoCarroBlindadoVersion) {
    this.context = context;
    this.version = version;
    this.startedAt = time;
    this.graphics = context.scene.add.graphics().setDepth(45);
  }

  update(time: number): void {
    this.age = Math.max(0, time - this.startedAt);
    this.state = this.getState(this.age);
    this.draw();
  }

  collides(player: PlayerState): boolean {
    if (this.state !== "active") {
      return false;
    }

    const thickness = Phaser.Math.Clamp(this.context.arena.size * 0.027, 6.2, 8.2);
    return this.getActiveRays().some((ray) => {
      return circleIntersectsLine(player.position, player.radius, ray.start, ray.end, thickness);
    });
  }

  isFinished(): boolean {
    return this.age > LEONARDO_CARRO_BLINDADO_DURATION_MS[this.version];
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private getState(age: number): CarroState {
    const activeEnd = SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[this.version];
    const revisionEnd = activeEnd + REVISION_MS;

    if (age < SKETCH_MS) {
      return "sketch";
    }
    if (age < SKETCH_MS + TELEGRAPH_MS) {
      return "telegraph";
    }
    if (age < activeEnd) {
      return "active";
    }
    if (age < revisionEnd) {
      return "revision";
    }
    return "fade";
  }

  private getStateProgress(): number {
    const starts: Record<CarroState, number> = {
      sketch: 0,
      telegraph: SKETCH_MS,
      active: SKETCH_MS + TELEGRAPH_MS,
      revision: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[this.version],
      fade: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[this.version] + REVISION_MS,
    };
    const durations: Record<CarroState, number> = {
      sketch: SKETCH_MS,
      telegraph: TELEGRAPH_MS,
      active: ACTIVE_MS[this.version],
      revision: REVISION_MS,
      fade: FADE_MS,
    };
    return Phaser.Math.Clamp((this.age - starts[this.state]) / durations[this.state], 0, 1);
  }

  private getActiveAge(): number {
    return Phaser.Math.Clamp(this.age - SKETCH_MS - TELEGRAPH_MS, 0, ACTIVE_MS[this.version]);
  }

  private getActivePulse(): CarroPulse | null {
    const activeAge = this.getActiveAge();

    if (this.version === 1) {
      return {
        from: 0.42,
        to: 2.72,
        progress: Phaser.Math.Clamp(activeAge / 4300, 0, 1),
        barrel: 0,
      };
    }

    if (this.version === 2) {
      if (activeAge < 2100) {
        return {
          from: 0.42,
          to: 2.72,
          progress: activeAge / 2100,
          barrel: 0,
        };
      }
      if (activeAge < 3050) {
        return null;
      }
      return {
        from: 2.72,
        to: 0.42,
        progress: Phaser.Math.Clamp((activeAge - 3050) / 2250, 0, 1),
        barrel: 0,
      };
    }

    if (activeAge < 1850) {
      return {
        from: 0.4,
        to: 1.82,
        progress: activeAge / 1850,
        barrel: 0,
      };
    }
    if (activeAge < 2750) {
      return null;
    }
    return {
      from: 2.75,
      to: 1.36,
      progress: Phaser.Math.Clamp((activeAge - 2750) / 2050, 0, 1),
      barrel: 1,
    };
  }

  private getActiveRays(): FanRay[] {
    const pulse = this.getActivePulse();
    if (!pulse) {
      return [];
    }

    const angle = Phaser.Math.Linear(pulse.from, pulse.to, Phaser.Math.Easing.Sine.InOut(pulse.progress));
    return this.getFanRays(angle, pulse.barrel);
  }

  private getFanRays(angle: number, barrel: 0 | 1): FanRay[] {
    const center = this.getCarCenter();
    const { size } = this.context.arena;
    const barrelOffset = this.version === 3 ? (barrel === 0 ? -1 : 1) * size * 0.038 : 0;
    const source = new Phaser.Math.Vector2(center.x + barrelOffset, center.y + size * 0.006);
    const muzzleRadius = size * 0.12;
    const length = size * 1.18;

    return FAN_OFFSETS.map((offset) => {
      const rayAngle = angle + offset;
      const direction = new Phaser.Math.Vector2(Math.cos(rayAngle), Math.sin(rayAngle));
      return {
        start: source.clone().add(direction.clone().scale(muzzleRadius)),
        end: source.clone().add(direction.scale(length)),
        angle: rayAngle,
        barrel,
      };
    });
  }

  private getCarCenter(): Phaser.Math.Vector2 {
    const { arena } = this.context;
    return new Phaser.Math.Vector2(
      arena.x + arena.size * 0.5,
      arena.y + arena.size * 0.29,
    );
  }

  private draw(): void {
    this.graphics.clear();

    const progress = this.getStateProgress();
    const fade = this.state === "fade" ? 1 - progress : 1;
    const pulse = 0.5 + Math.sin(this.age * 0.017) * 0.5;
    const construction = this.state === "sketch"
      ? Phaser.Math.Easing.Cubic.Out(progress)
      : 1;
    const activePulse = this.getActivePulse();
    const turretAngle = activePulse
      ? Phaser.Math.Linear(activePulse.from, activePulse.to, Phaser.Math.Easing.Sine.InOut(activePulse.progress))
      : this.getRestingTurretAngle();

    this.drawFloorDiagram(construction, fade, pulse);
    if (this.state === "telegraph") {
      this.drawSweepTelegraph(fade, pulse);
    }

    if (this.state === "active") {
      const rays = this.getActiveRays();
      this.drawActiveRays(rays, fade, pulse);
      if (!activePulse) {
        this.drawPauseCorrection(fade, pulse);
      }
    }

    this.drawCar(turretAngle, activePulse?.barrel ?? 0, construction, fade, pulse);

    if (this.state === "revision") {
      this.drawRevision(progress, fade, pulse);
    }
  }

  private getRestingTurretAngle(): number {
    const activeAge = this.getActiveAge();
    if (this.version === 2 && activeAge >= 2100 && activeAge < 3050) {
      return 2.72;
    }
    if (this.version === 3 && activeAge >= 1850 && activeAge < 2750) {
      return 1.82;
    }
    return this.version === 3 ? 1.36 : 0.42;
  }

  private drawFloorDiagram(reveal: number, alpha: number, pulse: number): void {
    const { arena } = this.context;
    const center = this.getCarCenter();
    const radius = arena.size * 0.22;
    const ringAlpha = (0.2 + reveal * 0.34 + pulse * 0.08) * alpha;

    this.graphics.fillStyle(0x1c1713, 0.1 * reveal * alpha);
    this.graphics.fillCircle(center.x, center.y, radius * 1.16);
    this.graphics.lineStyle(1.1, 0x9d7650, ringAlpha);
    this.graphics.strokeCircle(center.x, center.y, radius);
    this.graphics.lineStyle(0.9, 0x91bfd1, ringAlpha * 0.7);
    this.graphics.strokeCircle(center.x, center.y, radius * 0.72);
    this.graphics.lineStyle(0.8, 0x9d7650, ringAlpha * 0.64);

    for (let index = 0; index < 12; index += 1) {
      const angle = (Math.PI * 2 * index) / 12;
      const inner = radius * 0.8;
      const outer = radius * 1.08;
      this.graphics.lineBetween(
        center.x + Math.cos(angle) * inner,
        center.y + Math.sin(angle) * inner,
        center.x + Math.cos(angle) * outer,
        center.y + Math.sin(angle) * outer,
      );
    }

    this.graphics.lineStyle(0.9, 0x8f6747, ringAlpha * 0.74);
    this.graphics.lineBetween(arena.x + 8, center.y, arena.x + arena.size - 8, center.y);
    this.graphics.lineBetween(center.x, arena.y + 8, center.x, arena.y + arena.size - 8);
  }

  private drawSweepTelegraph(alpha: number, pulse: number): void {
    const center = this.getCarCenter();
    const radius = this.context.arena.size * 0.76;
    const guideAlpha = (0.34 + pulse * 0.18) * alpha;

    if (this.version === 1) {
      this.drawSweepArc(center, radius, 0.42, 2.72, 0xc85745, guideAlpha);
      this.drawGhostFan(center, 0.42, 0, guideAlpha * 0.8);
      this.drawGhostFan(center, 2.72, 0, guideAlpha * 0.55);
      return;
    }

    if (this.version === 2) {
      this.drawSweepArc(center, radius, 0.42, 2.72, 0xc85745, guideAlpha);
      this.drawSweepArc(center, radius * 0.88, 2.72, 0.42, 0x87b8c8, guideAlpha * 0.76);
      this.drawGhostFan(center, 0.42, 0, guideAlpha * 0.76);
      this.drawGhostFan(center, 2.72, 0, guideAlpha * 0.76);
      return;
    }

    this.drawSweepArc(center, radius, 0.4, 1.82, 0xc85745, guideAlpha);
    this.drawSweepArc(center, radius * 0.88, 2.75, 1.36, 0x87b8c8, guideAlpha * 0.82);
    this.drawGhostFan(center, 0.4, 0, guideAlpha * 0.72);
    this.drawGhostFan(center, 2.75, 1, guideAlpha * 0.72);
  }

  private drawSweepArc(
    center: Phaser.Math.Vector2,
    radius: number,
    from: number,
    to: number,
    color: number,
    alpha: number,
  ): void {
    this.graphics.lineStyle(2.1, color, alpha);
    this.graphics.beginPath();
    this.graphics.arc(center.x, center.y, radius, from, to, to < from);
    this.graphics.strokePath();
    this.graphics.lineStyle(0.9, 0xd9b681, alpha * 0.72);
    this.graphics.beginPath();
    this.graphics.arc(center.x, center.y, radius * 0.94, from, to, to < from);
    this.graphics.strokePath();
  }

  private drawGhostFan(center: Phaser.Math.Vector2, angle: number, barrel: 0 | 1, alpha: number): void {
    const rays = this.getFanRays(angle, barrel);
    this.graphics.lineStyle(1.1, 0xc85845, alpha);
    for (const ray of rays) {
      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    }
    this.graphics.fillStyle(0xc85845, alpha * 0.7);
    this.graphics.fillCircle(center.x, center.y, Math.max(2, this.context.arena.size * 0.018));
  }

  private drawActiveRays(rays: FanRay[], alpha: number, pulse: number): void {
    for (const ray of rays) {
      this.graphics.lineStyle(12, 0x1c1010, 0.3 * alpha);
      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
      this.graphics.lineStyle(5.5, 0x8d302b, (0.62 + pulse * 0.14) * alpha);
      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
      this.graphics.lineStyle(1.25, 0xf0c47c, (0.8 + pulse * 0.12) * alpha);
      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
      this.graphics.fillStyle(ray.barrel === 0 ? 0xf0c47c : 0x9fd3de, 0.82 * alpha);
      this.graphics.fillCircle(ray.end.x, ray.end.y, Math.max(1.6, this.context.arena.size * 0.009));
    }
  }

  private drawPauseCorrection(alpha: number, pulse: number): void {
    const center = this.getCarCenter();
    const radius = this.context.arena.size * 0.26;
    const angle = this.getRestingTurretAngle();
    this.graphics.lineStyle(2.2, 0xca5548, (0.5 + pulse * 0.24) * alpha);
    this.graphics.beginPath();
    this.graphics.arc(center.x, center.y, radius, angle - 0.55, angle + 0.55, false);
    this.graphics.strokePath();
    this.graphics.fillStyle(0xca5548, (0.58 + pulse * 0.2) * alpha);
    this.graphics.fillTriangle(
      center.x + Math.cos(angle) * radius,
      center.y + Math.sin(angle) * radius - 5,
      center.x + Math.cos(angle) * radius - 5,
      center.y + Math.sin(angle) * radius + 5,
      center.x + Math.cos(angle) * radius + 5,
      center.y + Math.sin(angle) * radius + 5,
    );
  }

  private drawCar(angle: number, activeBarrel: 0 | 1, reveal: number, alpha: number, pulse: number): void {
    const center = this.getCarCenter();
    const { size } = this.context.arena;
    const bodyRadius = size * 0.105 * (0.74 + reveal * 0.26);
    const bodyAlpha = alpha * (0.58 + reveal * 0.42);

    this.graphics.fillStyle(0x171313, 0.88 * bodyAlpha);
    this.graphics.fillCircle(center.x, center.y, bodyRadius * 1.12);
    this.graphics.fillStyle(0x67472e, 0.92 * bodyAlpha);
    this.graphics.fillCircle(center.x, center.y, bodyRadius);
    this.graphics.lineStyle(2.2, 0xd1a260, (0.68 + pulse * 0.16) * bodyAlpha);
    this.graphics.strokeCircle(center.x, center.y, bodyRadius * 1.05);
    this.graphics.lineStyle(1.1, 0x2b1714, 0.9 * bodyAlpha);
    this.graphics.strokeCircle(center.x, center.y, bodyRadius * 0.62);

    const barrelCount = this.version === 3 ? 2 : 1;
    for (let barrel = 0; barrel < barrelCount; barrel += 1) {
      const barrelId = barrel as 0 | 1;
      const localAngle = angle + (this.version === 3 ? (barrelId === 0 ? -0.13 : 0.13) : 0);
      const sourceX = center.x + (this.version === 3 ? (barrelId === 0 ? -1 : 1) * size * 0.038 : 0);
      const sourceY = center.y + size * 0.006;
      const barrelLength = size * 0.15;
      const endX = sourceX + Math.cos(localAngle) * barrelLength;
      const endY = sourceY + Math.sin(localAngle) * barrelLength;
      const selected = barrelId === activeBarrel;

      this.graphics.lineStyle(9, 0x1a1514, 0.76 * bodyAlpha);
      this.graphics.lineBetween(sourceX, sourceY, endX, endY);
      this.graphics.lineStyle(4.8, selected ? 0xb47a3f : 0x765031, (selected ? 0.94 : 0.7) * bodyAlpha);
      this.graphics.lineBetween(sourceX, sourceY, endX, endY);
      this.graphics.lineStyle(1.15, selected ? 0xf0cf8b : 0x9c7957, 0.72 * bodyAlpha);
      this.graphics.lineBetween(sourceX, sourceY, endX, endY);
      this.graphics.fillStyle(selected ? 0xf2c87f : 0x8b5f37, 0.86 * bodyAlpha);
      this.graphics.fillCircle(endX, endY, Math.max(2.1, size * 0.014));
    }

    this.graphics.fillStyle(0x2b1b17, 0.94 * bodyAlpha);
    this.graphics.fillCircle(center.x, center.y, bodyRadius * 0.42);
    this.graphics.lineStyle(1.1, 0xf0cf8b, 0.7 * bodyAlpha);
    this.graphics.strokeCircle(center.x, center.y, bodyRadius * 0.43);
  }

  private drawRevision(progress: number, alpha: number, pulse: number): void {
    const center = this.getCarCenter();
    const radius = this.context.arena.size * (0.22 + progress * 0.12);
    this.graphics.lineStyle(1.7, 0xc55347, (0.66 - progress * 0.3) * alpha);
    this.graphics.strokeCircle(center.x, center.y, radius);
    this.graphics.lineStyle(1, 0xe4b475, (0.52 + pulse * 0.12) * alpha);
    for (let index = 0; index < 4; index += 1) {
      const angle = progress * Math.PI * 2 + index * Math.PI / 2;
      this.graphics.lineBetween(
        center.x + Math.cos(angle) * radius * 0.58,
        center.y + Math.sin(angle) * radius * 0.58,
        center.x + Math.cos(angle) * radius,
        center.y + Math.sin(angle) * radius,
      );
    }
  }
}
