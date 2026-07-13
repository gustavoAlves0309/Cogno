import Phaser from "phaser";
import { ExpandingHieroglyphAttack } from "./ExpandingHieroglyphAttack";
import { HorusSunAttack } from "./HorusSunAttack";
import { NileRiseAttack } from "./NileRiseAttack";
import { ScaleOfMaatAttack } from "./ScaleOfMaatAttack";
import { ScarabVolleyAttack } from "./ScarabVolleyAttack";
import { circleIntersectsLine, circleIntersectsRect } from "../math/collision";
import { drawCleopatraPortrait } from "../rendering/CleopatraPortrait";
import { drawHorusEye, drawHorusRays, type HorusRayVisual, type HorusRayVisualState } from "../rendering/HorusVisuals";
import {
  drawScarabBody as drawSharedScarabBody,
  drawScarabTrail as drawSharedScarabTrail,
  drawScarabWindup,
} from "../rendering/ScarabVisuals";
import type { ArenaBounds, Attack, AttackContext, AttackCue, PlayerState } from "../types";

type IllusionSide = "left" | "right";
type ArenaEdge = "top" | "bottom";

interface MiniAttackBase {
  at: number;
  side: IllusionSide;
  telegraphMs: number;
  activeMs: number;
  fadeMs: number;
}

interface MiniScarabAttack extends MiniAttackBase {
  kind: "scarab";
  fromLane: number;
  toLane: number;
}

interface MiniGlyphAttack extends MiniAttackBase {
  kind: "glyph";
  x: number;
  y: number;
  radius: number;
}

interface HorusSliceAttack extends MiniAttackBase {
  kind: "slice";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface EdgeSweepAttack extends MiniAttackBase {
  kind: "edge";
  edge: ArenaEdge;
  depth: number;
}

type ArmyMiniAttack = MiniScarabAttack | MiniGlyphAttack | HorusSliceAttack | EdgeSweepAttack;

type RoyalCommandKind = "scarab" | "nile" | "horus" | "glyph" | "maat";

interface RoyalCommand {
  at: number;
  kind: RoyalCommandKind;
  spawned: boolean;
  side?: "left" | "right";
  targetLane?: number;
}

interface CastLine {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
}

export class ArmyOfIllusionsAttack implements Attack {
  readonly name = "Army of Illusions";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly originalArena: ArenaBounds;
  private readonly targetArena: ArenaBounds;
  private readonly attacks: ArmyMiniAttack[];
  private readonly royalCommands: RoyalCommand[];
  private readonly royalAttacks: Attack[] = [];
  private readonly summonMs = 2400;
  private readonly patternMs = 71000;
  private readonly recoverMs = 1600;
  private startedAt: number | null = null;
  private age = 0;
  private royalPhaseAnnounced = false;

  constructor(context: AttackContext, _time: number) {
    this.context = context;
    this.originalArena = { ...context.arena };
    this.targetArena = this.createTargetArena();
    this.attacks = this.createTimeline();
    this.royalCommands = this.createRoyalTimeline();
    this.graphics = context.scene.add.graphics().setDepth(57);
  }

  update(time: number, delta: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    this.age = time - this.startedAt;
    this.updateArena();
    this.clampPlayerToArena();
    this.updateRoyalCommands(time, delta);
    this.draw(time);
  }

  collides(player: PlayerState): boolean {
    const royalHit = this.royalAttacks.some((attack) => attack.collides(player));

    if (this.age < this.summonMs) {
      return royalHit;
    }

    return royalHit || this.attacks.some((attack) => {
      const localAge = this.getAttackAge(attack);
      if (localAge < attack.telegraphMs || localAge > attack.telegraphMs + attack.activeMs) {
        return false;
      }

      if (attack.kind === "scarab") {
        const position = this.getScarabPosition(attack, localAge);
        return Phaser.Math.Distance.Between(
          player.position.x,
          player.position.y,
          position.x,
          position.y,
        ) <= player.radius + this.getScarabRadius();
      }

      if (attack.kind === "glyph") {
        const radius = this.getGlyphRadius(attack, localAge);
        const center = this.getGlyphCenter(attack);
        return Phaser.Math.Distance.Between(
          player.position.x,
          player.position.y,
          center.x,
          center.y,
        ) <= player.radius + radius;
      }

      if (attack.kind === "edge") {
        return circleIntersectsRect(player.position, player.radius, this.getEdgeRect(attack));
      }

      const line = this.getSliceLine(attack);
      return circleIntersectsLine(player.position, player.radius, line.start, line.end, 12);
    });
  }

  isFinished(): boolean {
    return this.age > this.getTotalMs();
  }

  destroy(): void {
    for (const attack of this.royalAttacks) {
      attack.destroy();
    }
    this.royalAttacks.length = 0;
    this.restoreArena();
    this.graphics.destroy();
  }

  private createTargetArena(): ArenaBounds {
    const size = Math.floor(this.originalArena.size * 0.68);
    const centerX = this.originalArena.x + this.originalArena.size / 2;
    const centerY = this.originalArena.y + this.originalArena.size / 2;

    return {
      x: Math.floor(centerX - size / 2),
      y: Math.floor(centerY - size / 2),
      size,
    };
  }

  private createTimeline(): ArmyMiniAttack[] {
    const scarab = (at: number, side: IllusionSide, fromLane: number, toLane: number): MiniScarabAttack => ({
      kind: "scarab",
      at,
      side,
      fromLane,
      toLane,
      telegraphMs: 680,
      activeMs: 920,
      fadeMs: 220,
    });
    const glyph = (at: number, side: IllusionSide, x: number, y: number, radius = 0.17): MiniGlyphAttack => ({
      kind: "glyph",
      at,
      side,
      x,
      y,
      radius,
      telegraphMs: 860,
      activeMs: 1120,
      fadeMs: 260,
    });
    const slice = (
      at: number,
      side: IllusionSide,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ): HorusSliceAttack => ({
      kind: "slice",
      at,
      side,
      x1,
      y1,
      x2,
      y2,
      telegraphMs: 720,
      activeMs: 460,
      fadeMs: 240,
    });
    const edge = (at: number, side: IllusionSide, arenaEdge: ArenaEdge): EdgeSweepAttack => ({
      kind: "edge",
      at,
      side,
      edge: arenaEdge,
      depth: 0.16,
      telegraphMs: 780,
      activeMs: 1120,
      fadeMs: 300,
    });

    const base: ArmyMiniAttack[] = [
      scarab(1400, "left", 0.22, 0.68),
      glyph(3900, "right", 0.68, 0.72),
      edge(5200, "left", "bottom"),
      slice(6500, "left", -0.08, 0.25, 1.08, 0.25),
      scarab(8900, "right", 0.78, 0.32),
      glyph(11300, "left", 0.32, 0.28),
      edge(12500, "right", "top"),
      slice(13700, "right", 1.08, 0.16, -0.08, 0.84),

      scarab(16100, "left", 0.5, 0.5),
      glyph(17400, "right", 0.68, 0.34, 0.16),
      edge(18400, "right", "bottom"),
      slice(19600, "left", -0.08, 0.72, 1.08, 0.72),
      scarab(20700, "right", 0.24, 0.76),
      glyph(22900, "left", 0.38, 0.64, 0.16),
      edge(23800, "left", "bottom"),
      slice(24400, "right", 1.08, 0.86, -0.08, 0.14),

      scarab(26600, "left", 0.18, 0.82),
      scarab(27600, "right", 0.82, 0.18),
      edge(28700, "right", "top"),
      glyph(29700, "left", 0.5, 0.5, 0.18),
      slice(31500, "right", 1.08, 0.62, -0.08, 0.38),
      scarab(32800, "left", 0.64, 0.28),
      edge(33600, "left", "bottom"),
      glyph(34700, "right", 0.28, 0.76, 0.16),

      slice(36800, "left", -0.08, 0.18, 1.08, 0.82),
      scarab(37900, "right", 0.5, 0.22),
      edge(38600, "right", "bottom"),
      glyph(39700, "left", 0.72, 0.48, 0.15),
      scarab(41000, "left", 0.26, 0.72),
      slice(42600, "right", 1.08, 0.5, -0.08, 0.5),
      glyph(44000, "right", 0.34, 0.36, 0.16),

      scarab(45900, "left", 0.8, 0.34),
      scarab(46800, "right", 0.2, 0.66),
      slice(48600, "left", -0.08, 0.28, 1.08, 0.74),
      glyph(49900, "right", 0.5, 0.28, 0.15),
      glyph(51500, "left", 0.5, 0.72, 0.15),
      slice(53100, "right", 1.08, 0.08, -0.08, 0.92),
      scarab(54200, "left", 0.5, 0.5),

      glyph(56300, "left", 0.5, 0.12, 0.18),
      slice(57800, "right", 1.08, 0.22, -0.08, 0.06),
      glyph(59000, "right", 0.5, 0.88, 0.18),
      slice(60400, "left", -0.08, 0.78, 1.08, 0.96),
      scarab(61800, "right", 0.22, 0.84),
      scarab(62800, "left", 0.78, 0.16),
      glyph(64100, "left", 0.28, 0.1, 0.16),
      glyph(65400, "right", 0.72, 0.9, 0.16),
      slice(66600, "right", 1.08, 0.22, -0.08, 0.78),
      slice(68100, "left", -0.08, 0.78, 1.08, 0.22),
      scarab(69400, "left", 0.5, 0.5),
    ];

    const speedUp = (attack: ArmyMiniAttack): ArmyMiniAttack => ({
      ...attack,
      at: Math.round(attack.at * 0.77),
    });
    const endPressure: ArmyMiniAttack[] = [
      edge(54800, "right", "bottom"),
      glyph(56000, "left", 0.5, 0.18, 0.16),
      scarab(57200, "right", 0.2, 0.72),
      slice(58600, "left", -0.08, 0.18, 1.08, 0.84),
      glyph(60200, "right", 0.5, 0.82, 0.16),
      edge(61600, "left", "top"),
      scarab(62800, "left", 0.78, 0.24),
      slice(64200, "right", 1.08, 0.78, -0.08, 0.22),
      glyph(65600, "left", 0.28, 0.48, 0.15),
      scarab(67200, "right", 0.5, 0.5),
      edge(68600, "left", "bottom"),
    ];

    return [...base.map(speedUp), ...endPressure];
  }

  private createRoyalTimeline(): RoyalCommand[] {
    return [
      { at: 30000, kind: "maat", spawned: false },
      { at: 32600, kind: "scarab", spawned: false },
      { at: 35400, kind: "glyph", spawned: false },
      { at: 38200, kind: "nile", targetLane: 0.58, spawned: false },
      { at: 41000, kind: "horus", spawned: false },
      { at: 44000, kind: "scarab", spawned: false },
      { at: 49500, kind: "maat", spawned: false },
      { at: 50200, kind: "nile", targetLane: 0.42, spawned: false },
      { at: 53000, kind: "maat", spawned: false },
      { at: 53200, kind: "scarab", spawned: false },
      { at: 56000, kind: "glyph", spawned: false },
      { at: 59400, kind: "horus", spawned: false },
      { at: 65000, kind: "scarab", spawned: false },
      { at: 68200, kind: "glyph", spawned: false },
    ];
  }

  private updateArena(): void {
    const arenaProgress = this.getArenaProgress();
    const { arena } = this.context;

    arena.x = Phaser.Math.Linear(this.originalArena.x, this.targetArena.x, arenaProgress);
    arena.y = Phaser.Math.Linear(this.originalArena.y, this.targetArena.y, arenaProgress);
    arena.size = Phaser.Math.Linear(this.originalArena.size, this.targetArena.size, arenaProgress);
  }

  private restoreArena(): void {
    this.context.arena.x = this.originalArena.x;
    this.context.arena.y = this.originalArena.y;
    this.context.arena.size = this.originalArena.size;
  }

  private getArenaProgress(): number {
    if (this.age < this.summonMs) {
      return Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(this.age / this.summonMs, 0, 1));
    }

    if (this.age < this.summonMs + this.patternMs) {
      return 1;
    }

    const recoverAge = this.age - this.summonMs - this.patternMs;
    return 1 - Phaser.Math.Easing.Cubic.InOut(Phaser.Math.Clamp(recoverAge / this.recoverMs, 0, 1));
  }

  private clampPlayerToArena(): void {
    const { arena, player } = this.context;
    player.position.set(
      Phaser.Math.Clamp(player.position.x, arena.x + player.radius, arena.x + arena.size - player.radius),
      Phaser.Math.Clamp(player.position.y, arena.y + player.radius, arena.y + arena.size - player.radius),
    );
  }

  private updateRoyalCommands(time: number, delta: number): void {
    const patternAge = this.age - this.summonMs;

    if (patternAge >= 0) {
      for (const command of this.royalCommands) {
        if (!command.spawned && patternAge >= command.at) {
          this.spawnRoyalCommand(command, time);
        }
      }
    }

    for (const attack of this.royalAttacks) {
      attack.update(time, delta);
    }

    for (let index = this.royalAttacks.length - 1; index >= 0; index -= 1) {
      if (this.royalAttacks[index].isFinished()) {
        this.royalAttacks[index].destroy();
        this.royalAttacks.splice(index, 1);
      }
    }
  }

  private spawnRoyalCommand(command: RoyalCommand, time: number): void {
    command.spawned = true;

    if (!this.royalPhaseAnnounced) {
      this.royalPhaseAnnounced = true;
      this.context.playCue?.("phase");
      this.context.scene.cameras.main.flash(160, 232, 104, 104, false);
      this.context.scene.cameras.main.shake(170, 0.0025);
    }

    this.context.playCue?.(this.getRoyalCue(command.kind));
    this.royalAttacks.push(this.createRoyalAttack(command, time));
  }

  private createRoyalAttack(command: RoyalCommand, time: number): Attack {
    if (command.kind === "scarab") {
      return new ScarabVolleyAttack(this.context, time, undefined, { projectileCount: 3 });
    }

    if (command.kind === "nile") {
      const { arena } = this.context;
      return new NileRiseAttack(this.context, time, arena.y + arena.size * (command.targetLane ?? 0.58));
    }

    if (command.kind === "horus") {
      return new HorusSunAttack(this.context, time);
    }

    if (command.kind === "glyph") {
      return new ExpandingHieroglyphAttack(this.context, time);
    }

    return new ScaleOfMaatAttack(this.context, time, command.side);
  }

  private getRoyalCue(kind: RoyalCommandKind): AttackCue {
    return kind === "scarab" ? "scarab" : kind;
  }

  private getTotalMs(): number {
    return this.summonMs + this.patternMs + this.recoverMs;
  }

  private getAttackAge(attack: ArmyMiniAttack): number {
    return this.age - this.summonMs - attack.at;
  }

  private getAttackEnd(attack: ArmyMiniAttack): number {
    return attack.telegraphMs + attack.activeMs + attack.fadeMs;
  }

  private getScarabLine(attack: MiniScarabAttack): CastLine {
    const { arena } = this.context;
    const endX = attack.side === "left" ? arena.x + arena.size + 32 : arena.x - 32;
    const start = this.getClonePosition(attack);

    return {
      start,
      end: new Phaser.Math.Vector2(endX, arena.y + arena.size * attack.toLane),
    };
  }

  private getScarabPosition(attack: MiniScarabAttack, localAge: number): Phaser.Math.Vector2 {
    const line = this.getScarabLine(attack);
    const progress = Phaser.Math.Clamp((localAge - attack.telegraphMs) / attack.activeMs, 0, 1);
    return line.start.clone().lerp(line.end, Phaser.Math.Easing.Sine.InOut(progress));
  }

  private getScarabRadius(): number {
    return Phaser.Math.Clamp(this.context.arena.size * 0.038, 6.5, 9);
  }

  private getGlyphCenter(attack: MiniGlyphAttack): Phaser.Math.Vector2 {
    const { arena } = this.context;
    return new Phaser.Math.Vector2(arena.x + arena.size * attack.x, arena.y + arena.size * attack.y);
  }

  private getGlyphRadius(attack: MiniGlyphAttack, localAge: number): number {
    const maxRadius = this.context.arena.size * attack.radius;
    if (localAge < attack.telegraphMs) {
      return maxRadius;
    }

    const activeProgress = Phaser.Math.Clamp((localAge - attack.telegraphMs) / Math.min(480, attack.activeMs), 0, 1);
    return Phaser.Math.Linear(maxRadius * 0.35, maxRadius, Phaser.Math.Easing.Cubic.Out(activeProgress));
  }

  private getSliceLine(attack: HorusSliceAttack): CastLine {
    const { arena } = this.context;

    return {
      start: this.getClonePosition(attack),
      end: new Phaser.Math.Vector2(arena.x + arena.size * attack.x2, arena.y + arena.size * attack.y2),
    };
  }

  private getClonePosition(attack: ArmyMiniAttack): Phaser.Math.Vector2 {
    const { arena } = this.context;
    const x = this.getAnchorX(attack.side);
    let lane = 0.5;

    if (attack.kind === "scarab") {
      lane = attack.fromLane;
    } else if (attack.kind === "glyph") {
      lane = attack.y;
    } else if (attack.kind === "edge") {
      lane = attack.edge === "top" ? 0.22 : 0.78;
    } else {
      lane = attack.y1;
    }

    return new Phaser.Math.Vector2(x, arena.y + arena.size * this.getAnchorLane(lane));
  }

  private getEdgeRect(attack: EdgeSweepAttack): Phaser.Geom.Rectangle {
    const { arena } = this.context;
    const height = arena.size * attack.depth;
    const y = attack.edge === "top" ? arena.y : arena.y + arena.size - height;

    return new Phaser.Geom.Rectangle(arena.x, y, arena.size, height);
  }

  private getAnchorX(side: IllusionSide): number {
    const { arena } = this.context;
    return side === "left" ? arena.x - 36 : arena.x + arena.size + 36;
  }

  private getAnchorLane(lane: number): number {
    const anchors = [0.22, 0.5, 0.78];
    return anchors.reduce((closest, anchor) => (
      Math.abs(anchor - lane) < Math.abs(closest - lane) ? anchor : closest
    ), anchors[0]);
  }

  private draw(time: number): void {
    this.graphics.clear();

    const arenaProgress = this.getArenaProgress();
    this.drawCompressedArena(arenaProgress, time);
    this.drawMirrorAnchors(arenaProgress, time);
    this.drawMiniAttacks(time);
    this.drawArmyHalo(arenaProgress, time);
  }

  private drawCompressedArena(arenaProgress: number, time: number): void {
    const original = this.originalArena;
    const arena = this.context.arena;
    const pulse = 0.5 + Math.sin(time * 0.006) * 0.5;

    this.graphics.fillStyle(0x010407, arenaProgress * 0.42);
    this.graphics.fillRect(original.x, original.y, original.size, arena.y - original.y);
    this.graphics.fillRect(original.x, arena.y + arena.size, original.size, original.y + original.size - arena.y - arena.size);
    this.graphics.fillRect(original.x, arena.y, arena.x - original.x, arena.size);
    this.graphics.fillRect(arena.x + arena.size, arena.y, original.x + original.size - arena.x - arena.size, arena.size);

    this.graphics.lineStyle(3, 0xf0d58a, arenaProgress * (0.58 + pulse * 0.24));
    this.graphics.strokeRect(arena.x - 8, arena.y - 8, arena.size + 16, arena.size + 16);
    this.graphics.lineStyle(1.5, 0x8df7ff, arenaProgress * (0.42 + pulse * 0.18));
    this.graphics.strokeRect(arena.x - 14, arena.y - 14, arena.size + 28, arena.size + 28);
  }

  private drawMirrorAnchors(arenaProgress: number, time: number): void {
    if (arenaProgress <= 0.04) {
      return;
    }

    const { arena } = this.context;
    const pulse = 0.5 + Math.sin(time * 0.014) * 0.5;
    const alpha = arenaProgress * (0.5 + pulse * 0.18);

    this.graphics.lineStyle(1.2, 0x8df7ff, alpha * 0.22);
    for (const side of ["left", "right"] as const) {
      const x = this.getAnchorX(side);
      const railX = side === "left" ? arena.x - 12 : arena.x + arena.size + 12;
      this.graphics.lineBetween(railX, arena.y + arena.size * 0.16, railX, arena.y + arena.size * 0.84);
      this.graphics.lineStyle(1, 0xf0d58a, alpha * 0.18);
      this.graphics.lineBetween(x, arena.y + arena.size * 0.22, railX, arena.y + arena.size * 0.22);
      this.graphics.lineBetween(x, arena.y + arena.size * 0.5, railX, arena.y + arena.size * 0.5);
      this.graphics.lineBetween(x, arena.y + arena.size * 0.78, railX, arena.y + arena.size * 0.78);
      this.graphics.lineStyle(1.2, 0x8df7ff, alpha * 0.22);
    }

    for (const side of ["left", "right"] as const) {
      for (const [index, lane] of [0.22, 0.5, 0.78].entries()) {
        const x = this.getAnchorX(side);
        const y = arena.y + arena.size * lane;
        this.drawMirrorAnchorSeal(x, y, side, alpha, pulse, index);
      }
    }
  }

  private drawArmyHalo(arenaProgress: number, time: number): void {
    const { arena } = this.context;
    const pulse = 0.5 + Math.sin(time * 0.009) * 0.5;
    const alpha = arenaProgress * (0.2 + pulse * 0.12);
    const centerX = arena.x + arena.size / 2;
    const centerY = arena.y + arena.size / 2;
    const radius = arena.size * (0.55 + pulse * 0.018);

    this.graphics.lineStyle(1.1, 0x8df7ff, alpha * 0.46);
    for (let index = 0; index < 12; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 12 + time * 0.00045;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const tangent = angle + Math.PI / 2;
      const span = index % 3 === 0 ? 9 : 5;

      this.graphics.lineBetween(
        x - Math.cos(tangent) * span,
        y - Math.sin(tangent) * span,
        x + Math.cos(tangent) * span,
        y + Math.sin(tangent) * span,
      );

      if (index % 3 === 0) {
        this.graphics.fillStyle(0xf0d58a, alpha * 0.7);
        this.graphics.fillTriangle(x, y - 4, x - 4, y + 4, x + 4, y + 4);
      } else {
        this.graphics.fillStyle(0x35d6cb, alpha * 0.52);
        this.graphics.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
      }
    }
  }

  private drawMirrorAnchorSeal(
    x: number,
    y: number,
    side: IllusionSide,
    alpha: number,
    pulse: number,
    index: number,
  ): void {
    const direction = side === "left" ? 1 : -1;
    const capY = y - 18 - pulse * 1.4;
    const baseY = y + 19 + pulse * 0.8;

    this.graphics.fillStyle(0x02050a, 0.32 * alpha);
    this.graphics.fillTriangle(x - 15, baseY + 4, x + 15, baseY + 4, x, baseY + 12);
    this.graphics.fillStyle(0x071018, 0.88 * alpha);
    this.graphics.fillTriangle(x, capY, x - 13, y - 8, x + 13, y - 8);
    this.graphics.fillRect(x - 11, y - 8, 22, 24);
    this.graphics.lineStyle(2, 0xf0d58a, alpha * 0.84);
    this.graphics.strokeTriangle(x, capY, x - 13, y - 8, x + 13, y - 8);
    this.graphics.strokeRect(x - 11, y - 8, 22, 24);

    this.graphics.lineStyle(1.2, 0x8df7ff, alpha * 0.62);
    this.graphics.lineBetween(x, y - 4, x, y + 11);
    this.graphics.lineBetween(x - 5, y + 2, x + 5, y + 2);
    this.graphics.lineStyle(1, 0xf8f1d1, alpha * 0.48);
    this.graphics.lineBetween(x - direction * 6, y - 14, x + direction * 3, y - 4);
    this.graphics.lineBetween(x + direction * 3, y - 4, x - direction * 5, y + 7);

    this.graphics.fillStyle(index === 1 ? 0x35d6cb : 0xd8b65d, alpha * 0.76);
    this.graphics.fillRect(x - 4, baseY - 3, 8, 5);
  }

  private drawMiniAttacks(time: number): void {
    for (const attack of this.attacks) {
      const localAge = this.getAttackAge(attack);
      if (localAge < -520 || localAge > this.getAttackEnd(attack)) {
        continue;
      }

      this.drawClone(attack, localAge, time);

      if (attack.kind === "scarab") {
        this.drawMiniScarab(attack, localAge, time);
      } else if (attack.kind === "glyph") {
        this.drawMiniGlyph(attack, localAge, time);
      } else if (attack.kind === "edge") {
        this.drawEdgeSweep(attack, localAge, time);
      } else {
        this.drawHorusSlice(attack, localAge, time);
      }
    }
  }

  private drawClone(attack: ArmyMiniAttack, localAge: number, time: number): void {
    const position = this.getClonePosition(attack);
    const pulse = 0.5 + Math.sin(time * 0.014 + attack.at * 0.003) * 0.5;
    const alpha = this.getCloneAlpha(attack, localAge);

    if (alpha <= 0.02) {
      return;
    }

    this.drawCleopatraEcho(position.x, position.y, alpha, pulse);
  }

  private drawCleopatraEcho(x: number, y: number, alpha: number, pulse: number): void {
    const s = 0.26;
    const a = alpha * 0.72;
    drawCleopatraPortrait(this.graphics, x, y - 12 * s, s, { alpha: a, pulse, halo: true });
  }

  private getCloneAlpha(attack: ArmyMiniAttack, localAge: number): number {
    if (localAge < 0) {
      return Phaser.Math.Clamp(1 + localAge / 520, 0, 1) * 0.75;
    }

    if (localAge <= attack.telegraphMs + attack.activeMs) {
      return 1;
    }

    return 1 - Phaser.Math.Clamp((localAge - attack.telegraphMs - attack.activeMs) / attack.fadeMs, 0, 1);
  }

  private drawMiniScarab(attack: MiniScarabAttack, localAge: number, time: number): void {
    const line = this.getScarabLine(attack);
    const direction = line.end.clone().subtract(line.start).normalize();
    const distance = Phaser.Math.Distance.Between(line.start.x, line.start.y, line.end.x, line.end.y);

    if (localAge < attack.telegraphMs) {
      const progress = Phaser.Math.Clamp(localAge / attack.telegraphMs, 0, 1);
      const pulse = 0.55 + Math.sin(time * 0.028 + attack.at) * 0.18;
      this.graphics.lineStyle(2.2, 0xffd36f, (0.18 + progress * 0.22) * pulse);
      this.graphics.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      this.graphics.lineStyle(1.1, 0x8df7ff, 0.16 + progress * 0.14);
      this.graphics.lineBetween(line.start.x, line.start.y, line.end.x, line.end.y);
      drawScarabWindup(this.graphics, line.start, direction, distance, progress, {
        scale: 0.5,
        time: time + attack.at,
        visibility: 1.55,
      });
      return;
    }

    const position = this.getScarabPosition(attack, localAge);
    const alpha = localAge > attack.telegraphMs + attack.activeMs
      ? 1 - Phaser.Math.Clamp((localAge - attack.telegraphMs - attack.activeMs) / attack.fadeMs, 0, 1)
      : 1;
    drawSharedScarabTrail(this.graphics, position, direction, {
      alpha,
      scale: 0.43,
      segments: 6,
      time: time + attack.at,
    });
    drawSharedScarabBody(this.graphics, position, direction, {
      alpha,
      scale: 0.43,
      time: time + attack.at,
    });
  }

  private drawMiniGlyph(attack: MiniGlyphAttack, localAge: number, time: number): void {
    const center = this.getGlyphCenter(attack);
    const radius = this.getGlyphRadius(attack, localAge);
    const pulse = 0.5 + Math.sin(time * 0.026 + attack.at) * 0.5;
    const telegraphing = localAge < attack.telegraphMs;
    const fading = localAge > attack.telegraphMs + attack.activeMs;
    const fadeAlpha = fading
      ? 1 - Phaser.Math.Clamp((localAge - attack.telegraphMs - attack.activeMs) / attack.fadeMs, 0, 1)
      : 1;
    const alpha = telegraphing ? 0.34 + Phaser.Math.Clamp(localAge / attack.telegraphMs, 0, 1) * 0.28 : 0.72;

    this.graphics.fillStyle(telegraphing ? 0xd8b65d : 0x9d3837, alpha * fadeAlpha * (0.44 + pulse * 0.07));
    this.graphics.fillCircle(center.x, center.y, radius);
    this.graphics.fillStyle(0x071018, alpha * fadeAlpha * 0.26);
    this.graphics.fillCircle(center.x, center.y, Math.max(0, radius - 9));
    this.graphics.fillStyle(0x35d6cb, alpha * fadeAlpha * (telegraphing ? 0.08 : 0.12));
    this.graphics.fillCircle(center.x, center.y, Math.max(0, radius - 18));

    this.drawMiniGlyphBands(center, radius, telegraphing, fadeAlpha * alpha, time);

    this.graphics.lineStyle(telegraphing ? 3 : 5, telegraphing ? 0xf0d58a : 0xffd36f, fadeAlpha * (0.62 + pulse * 0.2));
    this.graphics.strokeCircle(center.x, center.y, radius);
    this.graphics.lineStyle(1.7, telegraphing ? 0x8df7ff : 0xf8f1d1, fadeAlpha * 0.46);
    this.graphics.strokeCircle(center.x, center.y, Math.max(5, radius - 8));
    this.graphics.lineStyle(1, 0x35d6cb, fadeAlpha * 0.28);
    this.graphics.strokeCircle(center.x, center.y, Math.max(4, radius - 17));

    for (let index = 0; index < 10; index += 1) {
      const angle = time * 0.0012 + attack.at * 0.01 + (Math.PI * 2 * index) / 10;
      const x = center.x + Math.cos(angle) * (radius + 6);
      const y = center.y + Math.sin(angle) * (radius + 6);

      if (index % 5 === 0) {
        this.graphics.fillStyle(0xf0d58a, fadeAlpha * 0.58);
        this.graphics.fillTriangle(x, y - 3.6, x - 3.2, y + 3.2, x + 3.2, y + 3.2);
      } else {
        this.graphics.fillStyle(index % 2 === 0 ? 0xf0d58a : 0x35d6cb, fadeAlpha * 0.5);
        this.graphics.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
      }
    }

    this.drawMiniGlyphCore(center, radius, fadeAlpha, pulse, !telegraphing);
  }

  private drawMiniGlyphBands(
    center: Phaser.Math.Vector2,
    radius: number,
    telegraphing: boolean,
    alpha: number,
    time: number,
  ): void {
    if (radius < 24) {
      return;
    }

    this.graphics.lineStyle(0.9, telegraphing ? 0x8df7ff : 0xf8f1d1, alpha * 0.26);
    for (let offset = -radius + 13; offset <= radius - 13; offset += 15) {
      const halfWidth = Math.sqrt(Math.max(0, radius * radius - offset * offset)) - 8;
      const y = center.y + offset + Math.sin(time * 0.014 + offset * 0.09) * 1.1;

      if (halfWidth > 12) {
        this.graphics.lineBetween(center.x - halfWidth, y, center.x + halfWidth, y);
      }
    }
  }

  private drawMiniGlyphCore(
    center: Phaser.Math.Vector2,
    radius: number,
    alpha: number,
    pulse: number,
    active: boolean,
  ): void {
    const size = Phaser.Math.Clamp(radius * 0.34, 10, 18);
    const glow = 0.56 + pulse * 0.22;
    const x = center.x;
    const y = center.y;

    this.graphics.fillStyle(0x071018, 0.84 * alpha);
    this.graphics.fillEllipse(x, y, size * 1.12, size * 1.74);
    this.graphics.lineStyle(2, active ? 0xffd36f : 0xf0d58a, glow * alpha);
    this.graphics.strokeEllipse(x, y, size * 1.12, size * 1.74);
    this.graphics.lineStyle(1.1, 0x8df7ff, 0.42 * alpha);
    this.graphics.strokeEllipse(x, y, size * 0.8, size * 1.38);

    this.graphics.lineStyle(1.7, 0xf8f1d1, 0.58 * alpha);
    this.graphics.strokeEllipse(x, y - size * 0.14, size * 0.66, size * 0.28);
    this.graphics.fillStyle(0x35d6cb, 0.72 * alpha);
    this.graphics.fillCircle(x, y - size * 0.14, size * 0.1);
    this.graphics.lineStyle(1.8, 0x35d6cb, 0.74 * alpha);
    this.graphics.lineBetween(x, y + size * 0.06, x, y + size * 0.62);
    this.graphics.lineBetween(x - size * 0.32, y + size * 0.21, x + size * 0.32, y + size * 0.21);
  }

  private drawEdgeSweep(attack: EdgeSweepAttack, localAge: number, time: number): void {
    const rect = this.getEdgeRect(attack);
    const telegraphing = localAge < attack.telegraphMs;
    const fading = localAge > attack.telegraphMs + attack.activeMs;
    const fadeAlpha = fading
      ? 1 - Phaser.Math.Clamp((localAge - attack.telegraphMs - attack.activeMs) / attack.fadeMs, 0, 1)
      : 1;
    const progress = telegraphing ? Phaser.Math.Clamp(localAge / attack.telegraphMs, 0, 1) : 1;
    const pulse = 0.5 + Math.sin(time * 0.03 + attack.at * 0.02) * 0.5;
    const edgeY = attack.edge === "top" ? rect.y + rect.height : rect.y;
    const warningY = attack.edge === "top"
      ? Phaser.Math.Linear(rect.y, edgeY, Phaser.Math.Easing.Cubic.Out(progress))
      : Phaser.Math.Linear(rect.y + rect.height, edgeY, Phaser.Math.Easing.Cubic.Out(progress));

    if (telegraphing) {
      this.graphics.fillStyle(0xd8b65d, (0.07 + pulse * 0.04) * fadeAlpha);
      this.graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
      this.graphics.fillStyle(0x35d6cb, (0.04 + progress * 0.06) * fadeAlpha);
      this.graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
      this.drawMiniNileMarks(rect, fadeAlpha * (0.34 + progress * 0.3));
      this.drawMiniNileSurface(rect, warningY, attack.edge, time, fadeAlpha * (0.48 + progress * 0.34), false);
      return;
    }

    this.graphics.fillStyle(0x153f55, (0.66 + pulse * 0.08) * fadeAlpha);
    this.graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.graphics.fillStyle(0x35d6cb, 0.12 * fadeAlpha);
    if (attack.edge === "top") {
      this.graphics.fillRect(rect.x, rect.y, rect.width, Math.max(4, rect.height * 0.4));
    } else {
      this.graphics.fillRect(rect.x, rect.y + rect.height * 0.6, rect.width, Math.max(4, rect.height * 0.4));
    }
    this.drawMiniNileMarks(rect, fadeAlpha * 0.58);
    this.drawMiniNileSurface(rect, edgeY, attack.edge, time, fadeAlpha, true);
  }

  private drawMiniNileSurface(
    rect: Phaser.Geom.Rectangle,
    y: number,
    edge: ArenaEdge,
    time: number,
    alpha: number,
    active: boolean,
  ): void {
    const direction = edge === "top" ? 1 : -1;
    const waveHeight = active ? 4.5 : 3;

    this.graphics.lineStyle(active ? 5 : 3, active ? 0xffd36f : 0xf0d58a, alpha * (active ? 0.74 : 0.62));
    this.graphics.beginPath();
    for (let x = rect.x - 4; x <= rect.x + rect.width + 4; x += 8) {
      const waveY = y + Math.sin(time * 0.018 + x * 0.08) * waveHeight;
      if (x <= rect.x - 4) {
        this.graphics.moveTo(x, waveY);
      } else {
        this.graphics.lineTo(x, waveY);
      }
    }
    this.graphics.strokePath();

    this.graphics.lineStyle(1.6, 0x8df7ff, alpha * (active ? 0.66 : 0.42));
    this.graphics.beginPath();
    for (let x = rect.x - 4; x <= rect.x + rect.width + 4; x += 8) {
      const waveY = y + direction * 5 + Math.sin(time * 0.021 + x * 0.11) * (waveHeight * 0.58);
      if (x <= rect.x - 4) {
        this.graphics.moveTo(x, waveY);
      } else {
        this.graphics.lineTo(x, waveY);
      }
    }
    this.graphics.strokePath();
  }

  private drawMiniNileMarks(rect: Phaser.Geom.Rectangle, alpha: number): void {
    this.graphics.lineStyle(1.1, 0xf8f1d1, alpha * 0.58);
    for (let y = rect.y + 7; y < rect.y + rect.height - 4; y += 9) {
      this.graphics.lineBetween(rect.x + 5, y, rect.x + 14, y);
      this.graphics.lineBetween(rect.x + rect.width - 5, y, rect.x + rect.width - 14, y);
    }

    this.graphics.lineStyle(0.9, 0x8df7ff, alpha * 0.42);
    for (let x = rect.x + 18; x < rect.x + rect.width; x += 28) {
      this.graphics.lineBetween(x, rect.y + 5, x, rect.y + rect.height - 5);
    }
  }

  private drawHorusSlice(attack: HorusSliceAttack, localAge: number, time: number): void {
    const line = this.getSliceLine(attack);
    const eye = line.start.clone().add(new Phaser.Math.Vector2(attack.side === "left" ? -2 : 2, -18));
    let state: HorusRayVisualState = "fade";
    let charge = 1;

    if (localAge < attack.telegraphMs) {
      state = "telegraph";
      charge = Phaser.Math.Clamp(localAge / attack.telegraphMs, 0, 1);
    } else if (localAge < attack.telegraphMs + attack.activeMs) {
      state = "active";
    } else {
      state = "fade";
      charge = 1 - Phaser.Math.Clamp((localAge - attack.telegraphMs - attack.activeMs) / attack.fadeMs, 0, 1);
    }

    const ray: HorusRayVisual = {
      start: eye,
      end: line.end,
      state,
    };
    drawHorusRays(this.graphics, [ray], { age: time + attack.at, charge, scale: 0.5 });

    if (state !== "fade" || charge > 0.18) {
      drawHorusEye(this.graphics, eye, {
        age: time + attack.at,
        charge: Math.max(0.22, charge),
        scale: 0.26,
      });
    }
  }
}
