import Phaser from "phaser";
import type { Attack, AttackContext, PlayerState } from "../types";
import {
  buildWingGeometry,
  circleIntersectsWingPanels,
  getWingArenaSignature,
  getWingPassFrame,
  type WingGeometry,
  type WingPanel,
  type WingPassFrame,
  type WingPassGeometry,
} from "../mechanics/leonardoWingGeometry";
import type { Point2, Segment2 } from "../mechanics/leonardoPerspectiveGeometry";
import {
  getWingTimelineSnapshot,
  type WingPassPreview,
  type WingProfile,
  type WingTimelineSnapshot,
} from "../mechanics/leonardoWingTimeline";

const COLORS = {
  canvas: 0xdac28a,
  canvasShadow: 0x8e744f,
  wood: 0x604738,
  danger: 0x5b1719,
  construction: 0x63898a,
  constructionLight: 0x94b1aa,
  safe: 0xf1dda5,
  dissolve: 0x27484a,
  brass: 0xa7834d,
} as const;
const WING_PROFILES: readonly WingProfile[] = ["v1", "v2", "v3-intro", "v3-mature"];

interface RenderBounds {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

interface WingPanelAnchors {
  readonly innerLeading: Point2;
  readonly outerLeading: Point2;
  readonly outerTrailing: Point2;
  readonly innerTrailing: Point2;
}

let nextWingInstance = 1;

export class LeonardoAsaEmEstudoAttack implements Attack {
  readonly name = "Asa em Estudo";

  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly startedAt: number;
  private readonly instanceId: string;
  private snapshot: WingTimelineSnapshot;
  private geometry: WingGeometry | null = null;
  private failed = false;

  constructor(
    private readonly context: AttackContext,
    time: number,
    readonly profile: WingProfile,
  ) {
    this.graphics = context.scene.add.graphics().setDepth(44);
    this.startedAt = time;
    this.instanceId = (nextWingInstance++).toString(36);
    const validProfile = WING_PROFILES.includes(profile);
    this.failed = !validProfile;
    this.snapshot = getWingTimelineSnapshot(
      validProfile ? profile : "v1",
      0,
      this.instanceId,
    );
  }

  update(time: number): void {
    if (this.failed) {
      return;
    }

    this.snapshot = getWingTimelineSnapshot(
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
    if (
      this.failed
      || !this.geometry
      || !this.snapshot.isDamageActive
      || this.snapshot.passIndex === null
    ) {
      return false;
    }

    const pass = this.geometry.passes[this.snapshot.passIndex];
    if (!pass) {
      return false;
    }
    const frame = getWingPassFrame(pass, this.snapshot.passProgress);
    return circleIntersectsWingPanels(frame, player.position, player.radius);
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
    const arenaSignature = getWingArenaSignature(this.context.arena);
    if (arenaSignature === null) {
      this.failSafe();
      return false;
    }
    if (
      this.geometry?.arenaSignature === arenaSignature
      && this.geometry.profile === this.profile
    ) {
      return true;
    }

    const nextGeometry = buildWingGeometry(
      {
        x: this.context.arena.x,
        y: this.context.arena.y,
        size: this.context.arena.size,
      },
      this.profile,
    );
    if (!nextGeometry) {
      this.failSafe();
      return false;
    }

    this.geometry = nextGeometry;
    return true;
  }

  private failSafe(): void {
    this.failed = true;
    this.geometry = null;
    this.graphics.clear();
  }

  private draw(): void {
    const geometry = this.geometry;
    if (!geometry) {
      return;
    }

    const renderBounds = getWingRenderBounds(geometry);

    this.graphics.clear();
    this.drawPreview(geometry, this.snapshot.nextPreview, true, renderBounds);
    this.drawPreview(geometry, this.snapshot.currentPreview, false, renderBounds);

    if (this.snapshot.state === "active" && this.snapshot.passIndex !== null) {
      const pass = geometry.passes[this.snapshot.passIndex];
      if (pass) {
        this.drawActiveWing(
          getWingPassFrame(pass, this.snapshot.passProgress),
          this.snapshot.materializationProgress,
          renderBounds,
        );
      }
      return;
    }

    if (this.snapshot.state === "cadence" && this.snapshot.passIndex !== null) {
      const previousPass = geometry.passes[this.snapshot.passIndex - 1];
      if (previousPass) {
        this.drawDissolution(previousPass, this.snapshot.dissolutionProgress, renderBounds);
      }
      return;
    }

    if (this.snapshot.state === "dissolve" && this.snapshot.passIndex !== null) {
      const pass = geometry.passes[this.snapshot.passIndex];
      if (pass) {
        this.drawDissolution(pass, this.snapshot.dissolutionProgress, renderBounds);
      }
    }
  }

  private drawPreview(
    geometry: WingGeometry,
    preview: WingPassPreview | null,
    ghost: boolean,
    renderBounds: RenderBounds,
  ): void {
    if (!preview) {
      return;
    }
    const pass = geometry.passes[preview.passIndex];
    if (!pass) {
      return;
    }

    const drawProgress = this.snapshot.state === "windup" && !ghost
      ? this.snapshot.spatialTelegraphProgress
      : 1;
    const alpha = ghost ? 0.2 : 0.42 + drawProgress * 0.34;
    const width = ghost ? 0.95 : 2.8;
    const leftEntry = offsetAlongSpan(pass.entryGapCenter, pass, -pass.gap.halfWidth);
    const leftExit = offsetAlongSpan(pass.exitGapCenter, pass, -pass.gap.halfWidth);
    const rightEntry = offsetAlongSpan(pass.entryGapCenter, pass, pass.gap.halfWidth);
    const rightExit = offsetAlongSpan(pass.exitGapCenter, pass, pass.gap.halfWidth);

    this.graphics.lineStyle(width, ghost ? COLORS.construction : COLORS.constructionLight, alpha);
    if (ghost) {
      this.drawDashedLine(leftEntry, leftExit, drawProgress, 9, renderBounds);
      this.drawDashedLine(rightEntry, rightExit, drawProgress, 9, renderBounds);
    } else {
      this.drawPartialLine(leftEntry, leftExit, drawProgress, renderBounds);
      this.drawPartialLine(rightEntry, rightExit, drawProgress, renderBounds);
    }

    this.graphics.lineStyle(ghost ? 0.9 : 1.25, COLORS.construction, alpha * 0.76);
    this.drawDashedLine(
      pass.entryGapCenter,
      pass.exitGapCenter,
      drawProgress,
      ghost ? 5 : 7,
      renderBounds,
    );

    // Once the wing itself is materialized, its moving silhouette and gap
    // brackets already carry the current read. Keeping the old entry outline
    // would leave a disconnected ivory fragment behind diagonal passes.
    if (preview.isDamageActive) {
      return;
    }

    const entryProgress = getTravelProgress(pass, pass.entryCenter);
    const entryFrame = getWingPassFrame(pass, entryProgress);
    this.graphics.lineStyle(ghost ? 0.85 : 1.35, ghost ? COLORS.construction : COLORS.safe, alpha * 0.78);
    for (const panel of entryFrame.panels) {
      if (ghost) {
        this.drawDashedPolygon(panel.vertices, 10, renderBounds);
      } else {
        this.strokePolygon(panel.vertices, renderBounds);
      }
    }
    this.drawGapBrackets(
      entryFrame,
      alpha * (ghost ? 0.55 : 0.96),
      ghost ? 0.75 : 1.4,
      renderBounds,
    );
  }

  private drawActiveWing(
    frame: WingPassFrame,
    materialization: number,
    renderBounds: RenderBounds,
  ): void {
    const pulse = 0.5 + Math.sin(this.snapshot.elapsedMs * 0.018) * 0.5;

    for (const panel of frame.panels) {
      const membrane = buildWingMembrane(panel, this.profile);

      // The dim canonical panel keeps the rendered hazard congruent with the
      // collision polygon; the stronger irregular membrane supplies the wing
      // silhouette instead of reading as a rectangular barricade.
      this.graphics.fillStyle(COLORS.canvasShadow, 0.42 + materialization * 0.12);
      this.fillPolygon(panel.vertices, renderBounds);
      this.graphics.fillStyle(COLORS.danger, 0.1 + pulse * 0.055);
      this.fillPolygon(panel.vertices, renderBounds);

      this.graphics.fillStyle(COLORS.canvas, 0.74 + materialization * 0.2);
      this.fillPolygon(membrane, renderBounds);
      this.graphics.lineStyle(1.8, COLORS.wood, 0.9);
      this.strokePolygon(membrane, renderBounds);

      const anchors = getWingPanelAnchors(panel);
      this.graphics.lineStyle(3.1, COLORS.danger, 0.88 + pulse * 0.08);
      this.drawClippedLine(anchors.innerLeading, anchors.outerLeading, renderBounds);
      this.graphics.lineStyle(1.55, COLORS.danger, 0.68 + pulse * 0.14);
      this.drawClippedLine(anchors.innerLeading, anchors.innerTrailing, renderBounds);
    }

    this.graphics.lineStyle(1.25, COLORS.wood, 0.92);
    for (const rib of frame.ribs) {
      this.drawClippedLine(rib[0], rib[1], renderBounds);
    }
    this.drawVersionDetails(frame, renderBounds);
    this.drawGapBrackets(frame, 0.96, 2.35, renderBounds);
    this.drawAirTrails(frame, renderBounds);
  }

  private drawVersionDetails(frame: WingPassFrame, renderBounds: RenderBounds): void {
    if (this.profile === "v1") {
      this.graphics.lineStyle(1, COLORS.wood, 0.48);
      for (const panel of frame.panels) {
        const vertices = panel.vertices;
        this.drawClippedLine(vertices[0], vertices[2], renderBounds);
      }
      return;
    }

    this.graphics.fillStyle(COLORS.brass, 0.84);
    const jointRadius = this.profile === "v2" ? 2.2 : 2.6;
    for (const rib of frame.ribs) {
      const x = (rib[0].x + rib[1].x) / 2;
      const y = (rib[0].y + rib[1].y) / 2;
      if (pointInBounds({ x, y }, renderBounds)) {
        this.graphics.fillCircle(x, y, jointRadius);
      }
    }
    if (this.profile === "v2") {
      return;
    }

    this.graphics.lineStyle(1.15, COLORS.brass, 0.68);
    for (const panel of frame.panels) {
      const vertices = panel.vertices;
      const firstMid = midpointPoint(vertices[0], vertices[3]);
      const secondMid = midpointPoint(vertices[1], vertices[2]);
      this.drawClippedLine(firstMid, secondMid, renderBounds);
    }
  }

  private drawGapBrackets(
    frame: WingPassFrame,
    alpha: number,
    width: number,
    renderBounds: RenderBounds,
  ): void {
    const halfDepth = frame.panelDepth * 0.48;
    const leftCenter = offsetPoint(frame.gapCenter, frame.basis.spanAxis, -frame.gapHalfWidth);
    const rightCenter = offsetPoint(frame.gapCenter, frame.basis.spanAxis, frame.gapHalfWidth);
    const leftStart = offsetPoint(leftCenter, frame.basis.travelAxis, -halfDepth);
    const leftEnd = offsetPoint(leftCenter, frame.basis.travelAxis, halfDepth);
    const rightStart = offsetPoint(rightCenter, frame.basis.travelAxis, -halfDepth);
    const rightEnd = offsetPoint(rightCenter, frame.basis.travelAxis, halfDepth);

    this.graphics.lineStyle(width + 1, COLORS.construction, alpha * 0.5);
    this.drawClippedLine(leftStart, leftEnd, renderBounds);
    this.drawClippedLine(rightStart, rightEnd, renderBounds);
    this.graphics.lineStyle(width, COLORS.safe, alpha);
    this.drawClippedLine(leftStart, leftEnd, renderBounds);
    this.drawClippedLine(rightStart, rightEnd, renderBounds);
  }

  private drawAirTrails(frame: WingPassFrame, renderBounds: RenderBounds): void {
    this.graphics.lineStyle(1.1, COLORS.construction, 0.3);
    for (let index = -1; index <= 1; index += 1) {
      const spanOffset = index * frame.gapHalfWidth * 0.52;
      const anchor = offsetPoint(frame.center, frame.basis.spanAxis, spanOffset);
      const start = offsetPoint(anchor, frame.basis.travelAxis, -frame.panelDepth * 0.62);
      const end = offsetPoint(anchor, frame.basis.travelAxis, -frame.panelDepth * 1.8);
      this.drawClippedLine(start, end, renderBounds);
    }
  }

  private drawDissolution(
    pass: WingPassGeometry,
    progress: number,
    renderBounds: RenderBounds,
  ): void {
    const frame = getWingPassFrame(pass, 1);
    const fillAlpha = 1 - Phaser.Math.Clamp(progress / 0.15, 0, 1);
    if (fillAlpha > 0) {
      for (const panel of frame.panels) {
        this.graphics.fillStyle(COLORS.canvas, fillAlpha * 0.58);
        this.fillPolygon(buildWingMembrane(panel, this.profile), renderBounds);
      }
    }

    const segments = selectDissolveSegments(frame.dissolveSegments, 10);
    const strokeAlpha = Math.pow(1 - progress, 0.72) * 0.72;
    this.graphics.lineStyle(1.35, COLORS.dissolve, strokeAlpha);
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const drift = progress * (4 + (index % 3) * 1.5);
      const driftAxis = index % 2 === 0 ? frame.basis.spanAxis : frame.basis.travelAxis;
      const direction = index % 4 < 2 ? 1 : -1;
      const start = offsetPoint(segment[0], driftAxis, drift * direction);
      const endBase = offsetPoint(segment[1], driftAxis, drift * direction);
      const end = lerpPoint(start, endBase, Math.max(0.12, 1 - progress * 0.68));
      this.drawClippedLine(start, end, renderBounds);
    }
  }

  private drawPartialLine(
    start: Point2,
    end: Point2,
    progress: number,
    renderBounds: RenderBounds,
  ): void {
    const currentEnd = lerpPoint(start, end, Phaser.Math.Clamp(progress, 0, 1));
    this.drawClippedLine(start, currentEnd, renderBounds);
  }

  private drawDashedLine(
    start: Point2,
    end: Point2,
    progress: number,
    dashCount: number,
    renderBounds: RenderBounds,
  ): void {
    const visible = Phaser.Math.Clamp(progress, 0, 1);
    for (let index = 0; index < dashCount; index += 1) {
      const from = index / dashCount;
      const to = Math.min((index + 0.55) / dashCount, visible);
      if (from >= visible || to <= from) {
        break;
      }
      const a = lerpPoint(start, end, from);
      const b = lerpPoint(start, end, to);
      this.drawClippedLine(a, b, renderBounds);
    }
  }

  private drawDashedPolygon(
    points: readonly Point2[],
    dashCount: number,
    renderBounds: RenderBounds,
  ): void {
    for (let index = 0; index < points.length; index += 1) {
      this.drawDashedLine(
        points[index],
        points[(index + 1) % points.length],
        1,
        dashCount,
        renderBounds,
      );
    }
  }

  private drawClippedLine(
    start: Point2,
    end: Point2,
    renderBounds: RenderBounds,
  ): void {
    const clipped = clipSegmentToBounds(start, end, renderBounds);
    if (clipped) {
      this.graphics.lineBetween(clipped[0].x, clipped[0].y, clipped[1].x, clipped[1].y);
    }
  }

  private fillPolygon(points: readonly Point2[], renderBounds?: RenderBounds): void {
    const drawable = renderBounds ? clipPolygonToBounds(points, renderBounds) : points;
    if (drawable.length < 3) {
      return;
    }
    this.graphics.beginPath();
    this.graphics.moveTo(drawable[0].x, drawable[0].y);
    for (let index = 1; index < drawable.length; index += 1) {
      this.graphics.lineTo(drawable[index].x, drawable[index].y);
    }
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  private strokePolygon(points: readonly Point2[], renderBounds?: RenderBounds): void {
    const drawable = renderBounds ? clipPolygonToBounds(points, renderBounds) : points;
    if (drawable.length < 2) {
      return;
    }
    this.graphics.beginPath();
    this.graphics.moveTo(drawable[0].x, drawable[0].y);
    for (let index = 1; index < drawable.length; index += 1) {
      this.graphics.lineTo(drawable[index].x, drawable[index].y);
    }
    this.graphics.closePath();
    this.graphics.strokePath();
  }
}

function offsetAlongSpan(point: Point2, pass: WingPassGeometry, amount: number): Point2 {
  return offsetPoint(point, pass.basis.spanAxis, amount);
}

function offsetPoint(point: Point2, axis: Point2, amount: number): Point2 {
  return { x: point.x + axis.x * amount, y: point.y + axis.y * amount };
}

function getTravelProgress(pass: WingPassGeometry, center: Point2): number {
  const dx = pass.travelEnd.x - pass.travelStart.x;
  const dy = pass.travelEnd.y - pass.travelStart.y;
  const denominator = dx * dx + dy * dy;
  if (denominator <= 0) {
    return 0;
  }
  return Phaser.Math.Clamp(
    ((center.x - pass.travelStart.x) * dx + (center.y - pass.travelStart.y) * dy) / denominator,
    0,
    1,
  );
}

function getWingRenderBounds(geometry: WingGeometry): RenderBounds {
  const margin = Math.max(6, Math.min(10, geometry.arena.size * 0.025));
  return {
    left: geometry.arena.x - margin,
    right: geometry.arena.x + geometry.arena.size + margin,
    top: geometry.arena.y - margin,
    bottom: geometry.arena.y + geometry.arena.size + margin,
  };
}

function getWingPanelAnchors(panel: WingPanel): WingPanelAnchors {
  const vertices = panel.vertices;
  if (panel.id === "negative") {
    return {
      innerLeading: vertices[3],
      outerLeading: vertices[0],
      outerTrailing: vertices[1],
      innerTrailing: vertices[2],
    };
  }
  return {
    innerLeading: vertices[0],
    outerLeading: vertices[3],
    outerTrailing: vertices[2],
    innerTrailing: vertices[1],
  };
}

function buildWingMembrane(panel: WingPanel, profile: WingProfile): readonly Point2[] {
  const anchors = getWingPanelAnchors(panel);
  const isNegative = panel.id === "negative";
  const outerDepth = profile === "v1"
    ? (isNegative ? 0.58 : 0.72)
    : profile === "v2"
      ? 0.82
      : 0.94;
  const outerNotch = profile === "v1"
    ? (isNegative ? 0.3 : 0.2)
    : profile === "v2"
      ? 0.16
      : 0.08;
  const innerNotch = profile === "v1"
    ? (isNegative ? 0.12 : 0.25)
    : profile === "v2"
      ? 0.1
      : 0.04;

  const trailingPoint = (spanProgress: number, notch: number): Point2 => {
    const raw = lerpPoint(anchors.innerTrailing, anchors.outerTrailing, spanProgress);
    const matchingLeading = lerpPoint(anchors.innerLeading, anchors.outerLeading, spanProgress);
    return lerpPoint(raw, matchingLeading, notch);
  };

  return [
    anchors.innerLeading,
    lerpPoint(anchors.innerLeading, anchors.outerLeading, 0.46),
    anchors.outerLeading,
    lerpPoint(anchors.outerLeading, anchors.outerTrailing, outerDepth),
    trailingPoint(0.72, outerNotch),
    trailingPoint(0.38, innerNotch),
    anchors.innerTrailing,
  ];
}

function pointInBounds(point: Point2, bounds: RenderBounds): boolean {
  return point.x >= bounds.left
    && point.x <= bounds.right
    && point.y >= bounds.top
    && point.y <= bounds.bottom;
}

function clipSegmentToBounds(
  start: Point2,
  end: Point2,
  bounds: RenderBounds,
): Segment2 | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const p = [-dx, dx, -dy, dy];
  const q = [
    start.x - bounds.left,
    bounds.right - start.x,
    start.y - bounds.top,
    bounds.bottom - start.y,
  ];
  let from = 0;
  let to = 1;

  for (let index = 0; index < p.length; index += 1) {
    if (Math.abs(p[index]) < 1e-9) {
      if (q[index] < 0) {
        return null;
      }
      continue;
    }
    const ratio = q[index] / p[index];
    if (p[index] < 0) {
      from = Math.max(from, ratio);
    } else {
      to = Math.min(to, ratio);
    }
    if (from > to) {
      return null;
    }
  }

  return [lerpPoint(start, end, from), lerpPoint(start, end, to)];
}

function clipPolygonToBounds(
  points: readonly Point2[],
  bounds: RenderBounds,
): readonly Point2[] {
  let result = [...points];
  result = clipPolygonEdge(
    result,
    (point) => point.x >= bounds.left,
    (start, end) => intersectVertical(start, end, bounds.left),
  );
  result = clipPolygonEdge(
    result,
    (point) => point.x <= bounds.right,
    (start, end) => intersectVertical(start, end, bounds.right),
  );
  result = clipPolygonEdge(
    result,
    (point) => point.y >= bounds.top,
    (start, end) => intersectHorizontal(start, end, bounds.top),
  );
  return clipPolygonEdge(
    result,
    (point) => point.y <= bounds.bottom,
    (start, end) => intersectHorizontal(start, end, bounds.bottom),
  );
}

function clipPolygonEdge(
  points: readonly Point2[],
  isInside: (point: Point2) => boolean,
  intersect: (start: Point2, end: Point2) => Point2,
): Point2[] {
  if (points.length === 0) {
    return [];
  }
  const clipped: Point2[] = [];
  let previous = points[points.length - 1];
  let previousInside = isInside(previous);

  for (const current of points) {
    const currentInside = isInside(current);
    if (currentInside !== previousInside) {
      clipped.push(intersect(previous, current));
    }
    if (currentInside) {
      clipped.push(current);
    }
    previous = current;
    previousInside = currentInside;
  }
  return clipped;
}

function intersectVertical(start: Point2, end: Point2, x: number): Point2 {
  const dx = end.x - start.x;
  const progress = Math.abs(dx) < 1e-9 ? 0 : (x - start.x) / dx;
  return { x, y: Phaser.Math.Linear(start.y, end.y, progress) };
}

function intersectHorizontal(start: Point2, end: Point2, y: number): Point2 {
  const dy = end.y - start.y;
  const progress = Math.abs(dy) < 1e-9 ? 0 : (y - start.y) / dy;
  return { x: Phaser.Math.Linear(start.x, end.x, progress), y };
}

function midpointPoint(first: Point2, second: Point2): Point2 {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function lerpPoint(start: Point2, end: Point2, progress: number): Point2 {
  return {
    x: Phaser.Math.Linear(start.x, end.x, progress),
    y: Phaser.Math.Linear(start.y, end.y, progress),
  };
}

function selectDissolveSegments(
  segments: readonly Segment2[],
  maximum: number,
): readonly Segment2[] {
  if (segments.length <= maximum) {
    return segments;
  }
  const selected: Segment2[] = [];
  for (let index = 0; index < maximum; index += 1) {
    selected.push(segments[Math.floor((index * segments.length) / maximum)]);
  }
  return selected;
}
