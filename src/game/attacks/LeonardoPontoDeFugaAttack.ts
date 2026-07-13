import Phaser from "phaser";
import {
  getPolygonPathPrefix,
  pointInConvexPolygon,
  transformPerspectiveFigures,
  validatePerspectiveGeometry,
  type ArenaSquare,
  type PerspectiveFigureId,
  type Point2,
} from "../mechanics/leonardoPerspectiveGeometry";
import {
  buildPerspectiveRenderGeometry,
  type PerspectiveRenderGeometry,
} from "../mechanics/leonardoPerspectiveRenderGeometry";
import {
  getPerspectiveTimelineSnapshot,
  type PerspectiveProfile,
  type PerspectiveTimelineSnapshot,
} from "../mechanics/leonardoPerspectiveTimeline";
import type { Attack, AttackContext, PlayerState } from "../types";

const COLORS = {
  cyan: 0x67ded8,
  danger: 0x5b1719,
  guide: 0x94dfe2,
  ink: 0x27484a,
  ivory: 0xefe4c8,
  warning: 0xb9554c,
} as const;

let nextPerspectiveInstance = 1;
const CLOSURE_PULSE_STATE_FRACTION = 120 / 650;

interface PerspectiveGeometryCache {
  readonly boundsSignature: string;
  readonly arena: ArenaSquare;
  readonly figures: ReadonlyMap<PerspectiveFigureId, PerspectiveRenderGeometry>;
}

/**
 * Janela de Perspectiva: Leonardo draws one closed safe figure at a time. The
 * exterior becomes dangerous on the exact frame in which the perimeter closes.
 */
export class LeonardoPontoDeFugaAttack implements Attack {
  readonly name = "Janela de Perspectiva";

  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly startedAt: number;
  private readonly instanceId: string;
  private snapshot: PerspectiveTimelineSnapshot;
  private geometry: PerspectiveGeometryCache | null = null;
  private failed = false;

  constructor(
    private readonly context: AttackContext,
    time: number,
    readonly profile: PerspectiveProfile,
  ) {
    this.graphics = context.scene.add.graphics().setDepth(42);
    this.startedAt = time;
    this.instanceId = (nextPerspectiveInstance++).toString(36);
    this.snapshot = getPerspectiveTimelineSnapshot(profile, 0, this.instanceId);
  }

  update(time: number): void {
    if (this.failed) {
      return;
    }

    this.snapshot = getPerspectiveTimelineSnapshot(
      this.profile,
      time - this.startedAt,
      this.instanceId,
    );

    if (this.snapshot.state === "complete") {
      this.graphics.clear();
      return;
    }

    if (!this.syncGeometry()) {
      return;
    }
    this.draw();
  }

  collides(player: PlayerState): boolean {
    if (this.failed || !this.snapshot.isDamageActive || !this.snapshot.figureId) {
      return false;
    }

    const figure = this.geometry?.figures.get(this.snapshot.figureId);
    return figure ? !pointInConvexPolygon(player.position, figure.contour, 2) : false;
  }

  getDamageWindowKey(): string | null {
    return this.failed || !this.geometry ? null : this.snapshot.damageKey;
  }

  isFinished(): boolean {
    return this.failed || this.snapshot.state === "complete";
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private syncGeometry(): boolean {
    const source = this.context.arena;
    const signature = `${source.x}:${source.y}:${source.size}`;
    if (this.geometry?.boundsSignature === signature) {
      return true;
    }

    try {
      const arena: ArenaSquare = { x: source.x, y: source.y, size: source.size };
      const transformed = transformPerspectiveFigures(arena);
      validatePerspectiveGeometry(transformed, arena);

      const figures = new Map<PerspectiveFigureId, PerspectiveRenderGeometry>();
      for (const figure of transformed) {
        figures.set(figure.id, buildPerspectiveRenderGeometry(arena, figure));
      }

      const nextGeometry: PerspectiveGeometryCache = {
        boundsSignature: signature,
        arena,
        figures,
      };
      this.geometry = nextGeometry;
      return true;
    } catch (error) {
      this.failSafely(error);
      return false;
    }
  }

  private failSafely(error: unknown): void {
    this.failed = true;
    this.geometry = null;
    this.graphics.clear();
    const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
    if (meta.env?.DEV) {
      console.error("[Janela de Perspectiva] geometria inválida; ataque encerrado com segurança.", error);
    }
  }

  private draw(): void {
    this.graphics.clear();
    const figureId = this.snapshot.figureId;
    if (!figureId || !this.geometry) {
      return;
    }

    const figure = this.geometry.figures.get(figureId);
    if (!figure) {
      this.failSafely(new Error(`Figura ${figureId} ausente no cache geométrico.`));
      return;
    }

    const pulse = 0.5 + Math.sin(this.snapshot.elapsedMs * 0.014) * 0.5;
    if (this.snapshot.state === "windup") {
      this.drawWarningExterior(figure, pulse);
      this.drawSafeInterior(figure.contour, 0.07 + this.snapshot.guideProgress * 0.05, 0, false);
      this.drawStudyStrokes(figure, this.snapshot.guideProgress);
      this.drawConstructionStroke(figure.contour, this.snapshot.perimeterProgress, pulse);
      this.drawDrawingHead(figure.contour, this.snapshot.perimeterProgress, pulse);
      return;
    }

    if (this.snapshot.state === "active") {
      this.drawActiveExterior(figure.exteriorBands, 0.57 + pulse * 0.035);
      this.drawSafeInterior(figure.contour, 0.22 + pulse * 0.025, 0.98, true);
      this.drawConstructionStroke(figure.contour, 1, pulse);
      this.drawClosurePulse(figure.contour);
      return;
    }

    this.drawDissipation(figure, this.snapshot.stateProgress);
  }

  private drawWarningExterior(figure: PerspectiveRenderGeometry, pulse: number): void {
    const closing = this.snapshot.closingProgress;
    const alpha = 0.16 + this.snapshot.perimeterProgress * 0.1 + closing * 0.16 + pulse * 0.025;

    this.graphics.lineStyle(1.1, COLORS.warning, alpha);
    for (const segment of figure.warningHatchSegments) {
      this.graphics.lineBetween(segment[0].x, segment[0].y, segment[1].x, segment[1].y);
    }
  }

  private drawActiveExterior(
    exterior: readonly (readonly Point2[])[],
    alpha: number,
    color: number = COLORS.danger,
  ): void {
    this.graphics.fillStyle(color, alpha);
    this.graphics.beginPath();
    let hasDrawableBand = false;
    for (const band of exterior) {
      const first = band[0];
      if (!first || band.length < 3) {
        continue;
      }

      hasDrawableBand = true;
      this.graphics.moveTo(first.x, first.y);
      for (let index = 1; index < band.length; index += 1) {
        this.graphics.lineTo(band[index].x, band[index].y);
      }
      this.graphics.closePath();
    }
    if (hasDrawableBand) {
      this.graphics.fillPath();
    }
  }

  private drawSafeInterior(
    contour: readonly Point2[],
    fillAlpha: number,
    strokeAlpha: number,
    active: boolean,
  ): void {
    this.graphics.fillStyle(COLORS.ivory, fillAlpha);
    this.traceClosedPolygon(contour);
    this.graphics.fillPath();
    if (strokeAlpha > 0) {
      this.graphics.lineStyle(active ? 2.8 : 1.15, COLORS.cyan, strokeAlpha);
      this.traceClosedPolygon(contour);
      this.graphics.strokePath();
    }
  }

  private drawStudyStrokes(figure: PerspectiveRenderGeometry, reveal: number): void {
    const alpha = Phaser.Math.Clamp(reveal, 0, 1);
    if (alpha <= 0) {
      return;
    }

    this.graphics.lineStyle(1, COLORS.guide, alpha * 0.22);
    this.traceOpenPath(figure.studies.irregular.points);
    this.graphics.strokePath();

    this.graphics.lineStyle(1.05, COLORS.guide, alpha * 0.32);
    for (const segment of figure.dashedGuideSegments) {
      this.graphics.lineBetween(segment[0].x, segment[0].y, segment[1].x, segment[1].y);
    }
  }

  private drawConstructionStroke(
    contour: readonly Point2[],
    progress: number,
    pulse: number,
  ): void {
    const path = getPolygonPathPrefix(contour, progress);
    if (path.length < 2) {
      return;
    }

    const closing = this.snapshot.closingProgress;
    this.graphics.lineStyle(2.25 + closing * 0.95, COLORS.cyan, 0.88 + pulse * 0.1);
    this.traceOpenPath(path);
    this.graphics.strokePath();

    if (closing > 0) {
      this.graphics.lineStyle(5.4, COLORS.cyan, closing * (0.08 + pulse * 0.08));
      this.traceOpenPath(path);
      this.graphics.strokePath();
    }
  }

  private drawDrawingHead(
    contour: readonly Point2[],
    progress: number,
    pulse: number,
  ): void {
    const path = getPolygonPathPrefix(contour, progress);
    const head = path[path.length - 1];
    if (!head) {
      return;
    }

    const closing = this.snapshot.closingProgress;
    const radius = Phaser.Math.Clamp(this.geometry!.arena.size * 0.012, 2.6, 4.2);
    this.graphics.fillStyle(COLORS.cyan, 0.12 + pulse * 0.08 + closing * 0.12);
    this.graphics.fillCircle(head.x, head.y, radius * (2.2 + closing * 0.35));
    this.graphics.fillStyle(COLORS.ivory, 0.9);
    this.graphics.fillCircle(head.x, head.y, radius * 0.56);
  }

  private drawClosurePulse(contour: readonly Point2[]): void {
    const start = contour[0];
    if (!start || this.snapshot.stateProgress >= CLOSURE_PULSE_STATE_FRACTION) {
      return;
    }

    const progress = this.snapshot.stateProgress / CLOSURE_PULSE_STATE_FRACTION;
    const fade = 1 - progress;
    const radius = Phaser.Math.Clamp(this.geometry!.arena.size * 0.018, 4.2, 6.6);
    this.graphics.fillStyle(COLORS.cyan, fade * 0.18);
    this.graphics.fillCircle(start.x, start.y, radius * (0.85 + progress * 1.45));
    this.graphics.lineStyle(1.4, COLORS.cyan, fade * 0.72);
    this.graphics.strokeCircle(start.x, start.y, radius * (0.7 + progress * 1.8));
  }

  private drawDissipation(
    figure: PerspectiveRenderGeometry,
    progress: number,
  ): void {
    const fade = 1 - Phaser.Math.Clamp(progress, 0, 1);
    this.drawActiveExterior(figure.exteriorBands, fade * 0.36, COLORS.ink);
    this.drawSafeInterior(figure.contour, fade * 0.11, fade * 0.66, false);
  }

  private traceOpenPath(points: readonly Point2[]): void {
    const first = points[0];
    if (!first) {
      return;
    }
    this.graphics.beginPath();
    this.graphics.moveTo(first.x, first.y);
    for (let index = 1; index < points.length; index += 1) {
      this.graphics.lineTo(points[index].x, points[index].y);
    }
  }

  private traceClosedPolygon(points: readonly Point2[]): void {
    this.traceOpenPath(points);
    this.graphics.closePath();
  }
}
