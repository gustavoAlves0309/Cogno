import Phaser from "phaser";
import type { Attack, AttackContext, PlayerState } from "../types";

export type LeonardoPonteSalvadoraVersion = 1 | 2 | 3;

type PonteState = "sketch" | "telegraph" | "active" | "revision" | "fade";

interface BridgeSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SKETCH_MS = 850;
const TELEGRAPH_MS = 1350;
const REVISION_MS = 1050;
const FADE_MS = 350;
const ACTIVE_MS: Record<LeonardoPonteSalvadoraVersion, number> = {
  1: 5000,
  2: 6000,
  3: 6000,
};

export const LEONARDO_PONTE_SALVADORA_DURATION_MS: Record<LeonardoPonteSalvadoraVersion, number> = {
  1: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[1] + REVISION_MS + FADE_MS,
  2: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[2] + REVISION_MS + FADE_MS,
  3: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[3] + REVISION_MS + FADE_MS,
};

/**
 * A deterministic safe-route attack. Dark water is dangerous only during the
 * active section; the wooden bridge segments returned by getSafeSegments are
 * the complete collision-safe area.
 */
export class LeonardoPonteSalvadoraAttack implements Attack {
  readonly name = "Ponte Salvadora";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly version: LeonardoPonteSalvadoraVersion;
  private readonly startedAt: number;
  private age = 0;
  private state: PonteState = "sketch";

  constructor(context: AttackContext, time: number, version: LeonardoPonteSalvadoraVersion) {
    this.context = context;
    this.version = version;
    this.startedAt = time;
    this.graphics = context.scene.add.graphics().setDepth(44);
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

    return !this.getSafeSegments().some((segment) => this.containsPlayer(segment, player));
  }

  isFinished(): boolean {
    return this.age > LEONARDO_PONTE_SALVADORA_DURATION_MS[this.version];
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private getState(age: number): PonteState {
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
    const starts: Record<PonteState, number> = {
      sketch: 0,
      telegraph: SKETCH_MS,
      active: SKETCH_MS + TELEGRAPH_MS,
      revision: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[this.version],
      fade: SKETCH_MS + TELEGRAPH_MS + ACTIVE_MS[this.version] + REVISION_MS,
    };
    const durations: Record<PonteState, number> = {
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

  private getSafeSegments(): BridgeSegment[] {
    const { arena } = this.context;
    const fullWidth = arena.size + 8;
    const bridgeHeight = arena.size * 0.245;
    const fullBridge = (centerY: number): BridgeSegment => ({
      x: arena.x - 4,
      y: centerY - bridgeHeight / 2,
      width: fullWidth,
      height: bridgeHeight,
    });

    if (this.version === 1) {
      return [fullBridge(arena.y + arena.size * 0.52)];
    }

    if (this.version === 2) {
      const activeAge = this.getActiveAge();
      const gateLocksAt = 2050;
      const routeChangesAt = 3050;
      const firstRoute = fullBridge(arena.y + arena.size * 0.36);
      const secondRoute = fullBridge(arena.y + arena.size * 0.68);
      return activeAge < routeChangesAt || activeAge < gateLocksAt ? [firstRoute] : [secondRoute];
    }

    const activeAge = this.getActiveAge();
    const retractsAt = 3150;
    const centerY = arena.y + arena.size * 0.52;
    const bridge = fullBridge(centerY);
    if (activeAge < retractsAt) {
      return [bridge];
    }

    return [{
      ...bridge,
      width: arena.size * 0.59 + 4,
    }];
  }

  private containsPlayer(segment: BridgeSegment, player: PlayerState): boolean {
    const forgiveness = Math.max(1, this.context.arena.size * 0.006);
    return (
      player.position.x - player.radius >= segment.x - forgiveness
      && player.position.x + player.radius <= segment.x + segment.width + forgiveness
      && player.position.y - player.radius >= segment.y - forgiveness
      && player.position.y + player.radius <= segment.y + segment.height + forgiveness
    );
  }

  private draw(): void {
    this.graphics.clear();

    const progress = this.getStateProgress();
    const fade = this.state === "fade" ? 1 - progress : 1;
    const pulse = 0.5 + Math.sin(this.age * 0.015) * 0.5;
    const reveal = this.state === "sketch"
      ? Phaser.Math.Easing.Cubic.Out(progress)
      : 1;
    const active = this.state === "active";

    this.drawBanks(reveal, fade);
    this.drawConstructionGuides(reveal, fade, pulse);

    if (this.state !== "sketch") {
      this.drawFlood(active ? 0.58 : 0.18 + progress * 0.1, fade, pulse);
    }

    const segments = this.getSafeSegments();
    const bridgeAlpha = active ? 1 : (0.42 + reveal * 0.58) * fade;
    for (const segment of segments) {
      this.drawBridge(segment, bridgeAlpha, active, pulse);
    }

    if (this.version === 2) {
      this.drawVersionTwoGates(segments[0], fade, pulse);
    } else if (this.version === 3) {
      this.drawVersionThreeRetraction(segments[0], fade, pulse);
    }

    if (this.state === "revision") {
      this.drawRevision(progress, fade);
    }
  }

  private drawBanks(reveal: number, alpha: number): void {
    const { arena } = this.context;
    const topHeight = arena.size * 0.14;
    const bottomHeight = arena.size * 0.14;

    this.graphics.fillStyle(0x2d1b12, 0.3 * reveal * alpha);
    this.graphics.fillRect(arena.x - 8, arena.y - 8, arena.size + 16, topHeight);
    this.graphics.fillRect(arena.x - 8, arena.y + arena.size - bottomHeight + 8, arena.size + 16, bottomHeight);
    this.graphics.lineStyle(1.3, 0x93714c, 0.52 * reveal * alpha);
    this.graphics.lineBetween(arena.x - 8, arena.y + topHeight, arena.x + arena.size + 8, arena.y + topHeight);
    this.graphics.lineBetween(
      arena.x - 8,
      arena.y + arena.size - bottomHeight,
      arena.x + arena.size + 8,
      arena.y + arena.size - bottomHeight,
    );
  }

  private drawConstructionGuides(reveal: number, alpha: number, pulse: number): void {
    const { arena } = this.context;
    const left = arena.x - 10;
    const right = arena.x + arena.size + 10;
    const centerX = arena.x + arena.size / 2;
    const centers = this.version === 2
      ? [arena.y + arena.size * 0.36, arena.y + arena.size * 0.68]
      : [arena.y + arena.size * 0.52];

    this.graphics.lineStyle(1.15, 0x8b6242, (0.22 + pulse * 0.12) * reveal * alpha);
    for (const centerY of centers) {
      this.graphics.lineBetween(left, centerY, right, centerY);
      this.graphics.lineBetween(centerX, arena.y - 8, centerX, centerY);
      this.graphics.lineBetween(centerX, arena.y + arena.size + 8, centerX, centerY);
    }

    this.graphics.lineStyle(0.9, 0x88bad1, 0.24 * reveal * alpha);
    for (let index = 0; index < 5; index += 1) {
      const x = Phaser.Math.Linear(arena.x + 10, arena.x + arena.size - 10, index / 4);
      this.graphics.lineBetween(x, arena.y + 6, centerX, arena.y + arena.size * 0.52);
    }
  }

  private drawFlood(alpha: number, fade: number, pulse: number): void {
    const { arena } = this.context;
    this.graphics.fillStyle(0x17131a, alpha * fade);
    this.graphics.fillRect(arena.x, arena.y, arena.size, arena.size);
    this.graphics.fillStyle(0x09242a, (alpha * 0.48 + pulse * 0.03) * fade);
    this.graphics.fillRect(arena.x + 3, arena.y + 3, arena.size - 6, arena.size - 6);

    this.graphics.lineStyle(1.1, 0x315d65, (0.25 + pulse * 0.12) * fade);
    for (let row = 0; row < 9; row += 1) {
      const y = arena.y + 12 + row * (arena.size - 24) / 8;
      this.drawWave(y, row, fade);
    }
  }

  private drawWave(y: number, row: number, alpha: number): void {
    const { arena } = this.context;
    this.graphics.beginPath();
    for (let x = arena.x; x <= arena.x + arena.size; x += 10) {
      const waveY = y + Math.sin(x * 0.08 + this.age * 0.009 + row * 1.3) * 2.6;
      if (x === arena.x) {
        this.graphics.moveTo(x, waveY);
      } else {
        this.graphics.lineTo(x, waveY);
      }
    }
    this.graphics.strokePath();
  }

  private drawBridge(segment: BridgeSegment, alpha: number, active: boolean, pulse: number): void {
    const plankCount = Math.max(5, Math.floor(segment.width / Math.max(18, this.context.arena.size * 0.105)));
    const outline = active ? 0xf2d197 : 0xc49b68;

    this.graphics.fillStyle(0x321e14, 0.96 * alpha);
    this.graphics.fillRoundedRect(segment.x, segment.y, segment.width, segment.height, Math.max(3, segment.height * 0.08));
    this.graphics.fillStyle(0x8c5c32, 0.74 * alpha);
    this.graphics.fillRect(segment.x + 3, segment.y + 3, segment.width - 6, segment.height - 6);
    this.graphics.lineStyle(active ? 2.2 : 1.5, outline, (0.66 + pulse * 0.18) * alpha);
    this.graphics.strokeRoundedRect(segment.x, segment.y, segment.width, segment.height, Math.max(3, segment.height * 0.08));
    this.graphics.lineStyle(1, 0xd3b17a, 0.44 * alpha);

    for (let index = 1; index < plankCount; index += 1) {
      const x = segment.x + segment.width * index / plankCount;
      this.graphics.lineBetween(x, segment.y + 3, x, segment.y + segment.height - 3);
    }

    this.graphics.lineStyle(1.25, 0xf4e2b9, 0.25 * alpha);
    this.graphics.lineBetween(segment.x + 7, segment.y + segment.height * 0.28, segment.x + segment.width - 7, segment.y + segment.height * 0.28);
    this.graphics.lineBetween(segment.x + 7, segment.y + segment.height * 0.72, segment.x + segment.width - 7, segment.y + segment.height * 0.72);
  }

  private drawVersionTwoGates(segment: BridgeSegment | undefined, alpha: number, pulse: number): void {
    if (!segment) {
      return;
    }

    const activeAge = this.getActiveAge();
    const warning = activeAge >= 2050 && activeAge < 3050;
    const switched = activeAge >= 3050;
    const { arena } = this.context;
    const gateXs = [arena.x + arena.size * 0.28, arena.x + arena.size * 0.72];
    const gateAlpha = (warning ? 0.84 : switched ? 0.64 : 0.38) * alpha;

    for (const x of gateXs) {
      this.graphics.lineStyle(3.4, warning ? 0xd96b4f : 0x64422d, gateAlpha);
      this.graphics.lineBetween(x, segment.y - 7, x, segment.y + segment.height + 7);
      this.graphics.lineStyle(1.15, 0xf3cf94, gateAlpha * 0.72);
      this.graphics.lineBetween(x - 6, segment.y - 4, x + 6, segment.y + 4);
      this.graphics.lineBetween(x - 6, segment.y + segment.height + 4, x + 6, segment.y + segment.height - 4);
    }

    if (warning) {
      const destinationY = arena.y + arena.size * 0.68;
      this.graphics.lineStyle(1.4, 0xc95045, (0.48 + pulse * 0.22) * alpha);
      this.graphics.lineBetween(arena.x + 12, destinationY, arena.x + arena.size - 12, destinationY);
      this.graphics.fillStyle(0xc95045, (0.44 + pulse * 0.18) * alpha);
      this.graphics.fillTriangle(arena.x + arena.size * 0.5, destinationY - 6, arena.x + arena.size * 0.5 - 6, destinationY + 5, arena.x + arena.size * 0.5 + 6, destinationY + 5);
    }
  }

  private drawVersionThreeRetraction(segment: BridgeSegment | undefined, alpha: number, pulse: number): void {
    const { arena } = this.context;
    const activeAge = this.getActiveAge();
    const warning = activeAge >= 2050 && activeAge < 3150;
    const retracted = activeAge >= 3150;
    const splitX = arena.x + arena.size * 0.59;
    const bridgeY = arena.y + arena.size * 0.52;

    this.graphics.lineStyle(2, warning ? 0xd45e4e : 0x5d3929, (warning ? 0.76 : 0.44) * alpha);
    this.graphics.lineBetween(splitX, bridgeY - arena.size * 0.15, splitX, bridgeY + arena.size * 0.15);

    if (!warning && !retracted) {
      return;
    }

    const retractProgress = retracted
      ? 1
      : Phaser.Math.Clamp((activeAge - 2050) / 1100, 0, 1);
    const right = arena.x + arena.size;
    this.graphics.fillStyle(0x111821, (0.34 + retractProgress * 0.32) * alpha);
    this.graphics.fillRect(splitX, bridgeY - arena.size * 0.122, right - splitX, arena.size * 0.245);
    this.graphics.lineStyle(1.5, 0xd15d4c, (0.36 + pulse * 0.24) * alpha);
    for (let index = 0; index < 5; index += 1) {
      const x = Phaser.Math.Linear(splitX + 8, right - 10, index / 4);
      const drop = 7 + retractProgress * (12 + (index % 2) * 8);
      this.graphics.lineBetween(x, bridgeY - 12, x + 7, bridgeY + drop);
    }

    if (segment && retracted) {
      this.graphics.lineStyle(1.6, 0x8fc8d0, 0.5 * alpha);
      this.graphics.lineBetween(segment.x + 6, segment.y + segment.height / 2, segment.x + segment.width - 6, segment.y + segment.height / 2);
    }
  }

  private drawRevision(progress: number, alpha: number): void {
    const { arena } = this.context;
    const inset = 14 + progress * 8;
    this.graphics.lineStyle(1.7, 0xc95045, (0.7 - progress * 0.3) * alpha);
    this.graphics.strokeRect(arena.x + inset, arena.y + inset, arena.size - inset * 2, arena.size - inset * 2);
    this.graphics.lineStyle(1, 0xe3ab73, (0.52 - progress * 0.24) * alpha);
    this.graphics.lineBetween(arena.x + inset, arena.y + inset, arena.x + arena.size - inset, arena.y + arena.size - inset);
    this.graphics.lineBetween(arena.x + arena.size - inset, arena.y + inset, arena.x + inset, arena.y + arena.size - inset);
  }
}
