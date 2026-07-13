import {
  buildArenaExteriorBands,
  getPolygonPathPrefix,
  polygonCentroid,
  subtractConvexPolygonFromSegment,
  type ArenaSquare,
  type PerspectiveFigure,
  type PerspectiveFigureId,
  type Point2,
  type Segment2,
} from "./leonardoPerspectiveGeometry";

export const PERSPECTIVE_IRREGULAR_STUDY_COVERAGE = 0.62;
export const PERSPECTIVE_GUIDE_STUDY_COVERAGE = 0.93;
export const PERSPECTIVE_STUDY_MAX_OFFSET_RATIO = 0.018;

const EPSILON = 1e-9;
const TAU = Math.PI * 2;
const HATCH_STEP_RATIO = 0.052;
const MIN_HATCH_STEP = 13;
const GUIDE_DASH_RATIO = 0.018;
const MIN_GUIDE_DASH = 4;
const GUIDE_GAP_TO_DASH_RATIO = 0.72;

const FIGURE_PHASE: Readonly<Record<PerspectiveFigureId, number>> = {
  A: 0.37,
  B: 2.11,
  C: 4.28,
};

export interface PerspectiveStudyPath {
  readonly coverage: number;
  readonly closed: false;
  readonly points: readonly Point2[];
}

export interface PerspectiveStudyPaths {
  readonly irregular: PerspectiveStudyPath;
  readonly guide: PerspectiveStudyPath;
}

export interface PerspectiveRenderGeometry {
  readonly contour: readonly Point2[];
  readonly studies: PerspectiveStudyPaths;
  readonly dashedGuideSegments: readonly Segment2[];
  readonly warningHatchSegments: readonly Segment2[];
  readonly exteriorBands: readonly (readonly Point2[])[];
}

function lerpPoint(start: Point2, end: Point2, progress: number): Point2 {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function assertArena(arena: ArenaSquare): void {
  if (
    !Number.isFinite(arena.x) ||
    !Number.isFinite(arena.y) ||
    !Number.isFinite(arena.size) ||
    arena.size <= 0
  ) {
    throw new Error("Perspective render geometry requires a finite, positive arena.");
  }
}

function buildOffsetStudyPath(
  arena: ArenaSquare,
  figure: PerspectiveFigure,
  coverage: number,
  kind: "irregular" | "guide",
): PerspectiveStudyPath {
  const canonical = getPolygonPathPrefix(figure.vertices, coverage);
  const center = polygonCentroid(figure.vertices);
  const phase = FIGURE_PHASE[figure.id];
  const lastIndex = Math.max(1, canonical.length - 1);

  const points = canonical.map((point, index) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const radialLength = Math.hypot(dx, dy);
    const progress = index / lastIndex;
    const offsetRatio =
      kind === "irregular"
        ? 0.0105 +
          Math.sin(progress * TAU * 1.35 + phase) * 0.0025 +
          Math.sin(progress * TAU * 2.4 + phase * 0.63) * 0.0008
        : 0.0035 + Math.sin(progress * TAU * 1.15 + phase + 0.8) * 0.0005;
    const offset = Math.min(
      arena.size * PERSPECTIVE_STUDY_MAX_OFFSET_RATIO,
      arena.size * offsetRatio,
    );

    if (radialLength <= EPSILON) {
      const angle = phase + progress * TAU;
      return {
        x: point.x + Math.cos(angle) * offset,
        y: point.y + Math.sin(angle) * offset,
      };
    }

    return {
      x: point.x + (dx / radialLength) * offset,
      y: point.y + (dy / radialLength) * offset,
    };
  });

  return { coverage, closed: false, points };
}

/**
 * Derives the two faint, non-functional Leonardo studies from the canonical
 * contour. Both paths remain open and use only deterministic, arena-relative
 * offsets so a resize rebuilds an equivalent composition.
 */
export function buildPerspectiveStudyPaths(
  arena: ArenaSquare,
  figure: PerspectiveFigure,
): PerspectiveStudyPaths {
  assertArena(arena);
  return {
    irregular: buildOffsetStudyPath(
      arena,
      figure,
      PERSPECTIVE_IRREGULAR_STUDY_COVERAGE,
      "irregular",
    ),
    guide: buildOffsetStudyPath(
      arena,
      figure,
      PERSPECTIVE_GUIDE_STUDY_COVERAGE,
      "guide",
    ),
  };
}

/**
 * Converts an open polyline into dash segments while carrying the accumulated
 * dash phase through every vertex instead of restarting it per edge.
 */
export function buildDashedPolylineSegments(
  points: readonly Point2[],
  dashLength: number,
  gapLength: number,
  phase = 0,
): readonly Segment2[] {
  if (!Number.isFinite(dashLength) || dashLength <= 0) {
    throw new Error("Dash length must be finite and positive.");
  }
  if (!Number.isFinite(gapLength) || gapLength < 0) {
    throw new Error("Gap length must be finite and non-negative.");
  }
  if (!Number.isFinite(phase)) {
    throw new Error("Dash phase must be finite.");
  }

  const period = dashLength + gapLength;
  const normalizedPhase = positiveModulo(phase, period);
  const dashed: Segment2[] = [];
  let traversed = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length <= EPSILON) {
      continue;
    }

    let localDistance = 0;
    while (localDistance < length - EPSILON) {
      const cyclePosition = positiveModulo(
        normalizedPhase + traversed + localDistance,
        period,
      );
      const drawing = cyclePosition < dashLength - EPSILON;
      const distanceToBoundary = drawing
        ? dashLength - cyclePosition
        : period - cyclePosition;
      const chunkLength = Math.min(length - localDistance, distanceToBoundary);

      if (chunkLength <= EPSILON) {
        localDistance += Math.min(length - localDistance, EPSILON);
        continue;
      }

      if (drawing) {
        dashed.push([
          lerpPoint(start, end, localDistance / length),
          lerpPoint(start, end, (localDistance + chunkLength) / length),
        ]);
      }
      localDistance += chunkLength;
    }
    traversed += length;
  }

  return dashed;
}

/** Creates the diagonal warning hatch already clipped to the safe contour. */
export function buildWarningHatchSegments(
  arena: ArenaSquare,
  contour: readonly Point2[],
): readonly Segment2[] {
  assertArena(arena);
  const step = Math.max(MIN_HATCH_STEP, arena.size * HATCH_STEP_RATIO);
  const right = arena.x + arena.size;
  const bottom = arena.y + arena.size;
  const segments: Segment2[] = [];

  for (let offset = -arena.size; offset <= arena.size + EPSILON; offset += step) {
    const bottomX = arena.x + offset;
    const topX = bottomX + arena.size;
    const start =
      bottomX < arena.x
        ? { x: arena.x, y: bottom - (arena.x - bottomX) }
        : { x: bottomX, y: bottom };
    const end =
      topX > right
        ? { x: right, y: bottom - (right - bottomX) }
        : { x: topX, y: arena.y };

    for (const segment of subtractConvexPolygonFromSegment(start, end, contour)) {
      if (
        Math.hypot(
          segment[1].x - segment[0].x,
          segment[1].y - segment[0].y,
        ) > EPSILON
      ) {
        segments.push(segment);
      }
    }
  }

  return segments;
}

/** Builds every expensive visual derivative once for the current arena bounds. */
export function buildPerspectiveRenderGeometry(
  arena: ArenaSquare,
  figure: PerspectiveFigure,
): PerspectiveRenderGeometry {
  assertArena(arena);
  const studies = buildPerspectiveStudyPaths(arena, figure);
  const dashLength = Math.max(MIN_GUIDE_DASH, arena.size * GUIDE_DASH_RATIO);
  const gapLength = dashLength * GUIDE_GAP_TO_DASH_RATIO;
  const dashPhase = (FIGURE_PHASE[figure.id] / TAU) * (dashLength + gapLength);

  return {
    // Identity is intentional: rendering may never diverge from collision.
    contour: figure.vertices,
    studies,
    dashedGuideSegments: buildDashedPolylineSegments(
      studies.guide.points,
      dashLength,
      gapLength,
      dashPhase,
    ),
    warningHatchSegments: buildWarningHatchSegments(arena, figure.vertices),
    exteriorBands: buildArenaExteriorBands(arena, figure.vertices),
  };
}
