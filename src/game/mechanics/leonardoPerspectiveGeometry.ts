export type PerspectiveFigureId = "A" | "B" | "C";

export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export interface ArenaSquare {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export interface NormalizedPerspectiveFigure {
  readonly id: PerspectiveFigureId;
  readonly vertices: readonly Point2[];
}

export interface NormalizedPerspectiveDefinition {
  readonly id: PerspectiveFigureId;
  readonly controlPoints: readonly Point2[];
}

export interface PerspectiveFigure {
  readonly id: PerspectiveFigureId;
  readonly vertices: readonly Point2[];
}

export type Segment2 = readonly [Point2, Point2];

const EPSILON = 1e-9;
const SAFE_SIDE_TOLERANCE = 2;
const FIGURE_IDS: readonly PerspectiveFigureId[] = ["A", "B", "C"];
const CONTROL_POINT_COUNT = 8;
const CHAIKIN_PASSES = 2;
const CONTOUR_SAMPLE_COUNT = 40;

const NORMALIZED_PERSPECTIVE_DEFINITIONS = [
  {
    id: "A",
    controlPoints: [
      { x: 0.065, y: 0.165 },
      { x: 0.205, y: 0.115 },
      { x: 0.37, y: 0.135 },
      { x: 0.445, y: 0.245 },
      { x: 0.4, y: 0.41 },
      { x: 0.27, y: 0.485 },
      { x: 0.105, y: 0.455 },
      { x: 0.035, y: 0.33 },
    ],
  },
  {
    id: "B",
    controlPoints: [
      { x: 0.52, y: 0.675 },
      { x: 0.64, y: 0.6 },
      { x: 0.8, y: 0.59 },
      { x: 0.925, y: 0.66 },
      { x: 0.935, y: 0.79 },
      { x: 0.815, y: 0.905 },
      { x: 0.65, y: 0.935 },
      { x: 0.515, y: 0.845 },
    ],
  },
  {
    id: "C",
    controlPoints: [
      { x: 0.51, y: 0.275 },
      { x: 0.575, y: 0.145 },
      { x: 0.715, y: 0.06 },
      { x: 0.86, y: 0.085 },
      { x: 0.955, y: 0.19 },
      { x: 0.89, y: 0.33 },
      { x: 0.75, y: 0.46 },
      { x: 0.59, y: 0.405 },
    ],
  },
] as const satisfies readonly NormalizedPerspectiveDefinition[];

const NORMALIZED_PERSPECTIVE_FIGURES: readonly NormalizedPerspectiveFigure[] =
  NORMALIZED_PERSPECTIVE_DEFINITIONS.map(({ id, controlPoints }) => ({
    id,
    vertices: buildCanonicalNormalizedContour(controlPoints),
  }));

export function chaikinClosed(points: readonly Point2[], passes: number): readonly Point2[] {
  if (!Number.isInteger(passes) || passes < 0) {
    throw new Error("Chaikin passes must be a non-negative integer.");
  }
  if (points.length < 3 || !points.every(isFinitePoint)) {
    throw new Error("Chaikin requires a finite closed path with at least three points.");
  }

  let result: Point2[] = points.map(({ x, y }) => ({ x, y }));
  for (let pass = 0; pass < passes; pass += 1) {
    const smoothed: Point2[] = [];
    for (let index = 0; index < result.length; index += 1) {
      const current = result[index];
      const next = result[(index + 1) % result.length];
      smoothed.push(
        lerpPoint(current, next, 0.25),
        lerpPoint(current, next, 0.75),
      );
    }
    result = smoothed;
  }
  return result;
}

export function resampleClosedPathByArcLength(
  points: readonly Point2[],
  sampleCount: number,
): readonly Point2[] {
  if (!Number.isInteger(sampleCount) || sampleCount < 3) {
    throw new Error("Closed-path sample count must be an integer of at least three.");
  }
  if (points.length < 3 || !points.every(isFinitePoint)) {
    throw new Error("Closed-path resampling requires at least three finite points.");
  }

  const segments = points.flatMap((start, index) => {
    const end = points[(index + 1) % points.length];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    return length > EPSILON ? [{ start, end, length }] : [];
  });
  const perimeter = segments.reduce((total, segment) => total + segment.length, 0);
  if (segments.length < 3 || perimeter <= EPSILON) {
    throw new Error("Closed path must have a finite, non-zero perimeter.");
  }

  const samples: Point2[] = [];
  let segmentIndex = 0;
  let traversed = 0;
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const target = (perimeter * sampleIndex) / sampleCount;
    while (
      segmentIndex < segments.length - 1 &&
      target > traversed + segments[segmentIndex].length + EPSILON
    ) {
      traversed += segments[segmentIndex].length;
      segmentIndex += 1;
    }

    const segment = segments[segmentIndex];
    samples.push(lerpPoint(segment.start, segment.end, (target - traversed) / segment.length));
  }
  return samples;
}

export function buildCanonicalNormalizedContour(
  controlPoints: readonly Point2[],
): readonly Point2[] {
  if (controlPoints.length !== CONTROL_POINT_COUNT) {
    throw new Error(`Perspective contour requires exactly ${CONTROL_POINT_COUNT} controls.`);
  }
  if (
    !controlPoints.every(isFinitePoint) ||
    signedPolygonArea(controlPoints) <= EPSILON ||
    !isConvexPolygon(controlPoints) ||
    hasSelfIntersections(controlPoints)
  ) {
    throw new Error("Perspective controls must be finite, clockwise, convex, and simple.");
  }

  const smoothed = chaikinClosed(controlPoints, CHAIKIN_PASSES);
  const contour = resampleClosedPathByArcLength(smoothed, CONTOUR_SAMPLE_COUNT);
  if (
    contour.length !== CONTOUR_SAMPLE_COUNT ||
    signedPolygonArea(contour) <= EPSILON ||
    !isConvexPolygon(contour) ||
    hasSelfIntersections(contour)
  ) {
    throw new Error("Canonical perspective contour is invalid.");
  }
  return contour;
}

export function hasSelfIntersections(points: readonly Point2[]): boolean {
  if (points.length < 4) {
    return false;
  }

  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    const firstNext = (firstIndex + 1) % points.length;
    for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
      const secondNext = (secondIndex + 1) % points.length;
      if (firstNext === secondIndex || secondNext === firstIndex) {
        continue;
      }
      if (
        segmentsIntersect(
          points[firstIndex],
          points[firstNext],
          points[secondIndex],
          points[secondNext],
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function playerRadiusForArena(arenaSize: number): number {
  return clamp(arenaSize * 0.02, 5.3, 7.4);
}

export function playerMaxSpeedForArena(arenaSize: number): number {
  return clamp(arenaSize * 0.78, 190, 270);
}

export function getNormalizedPerspectiveDefinitions(): readonly NormalizedPerspectiveDefinition[] {
  return NORMALIZED_PERSPECTIVE_DEFINITIONS;
}

export function getNormalizedPerspectiveDefinition(
  id: PerspectiveFigureId,
): NormalizedPerspectiveDefinition {
  const definition = NORMALIZED_PERSPECTIVE_DEFINITIONS.find(
    (candidate) => candidate.id === id,
  );
  if (!definition) {
    throw new Error(`Unknown perspective figure: ${String(id)}.`);
  }
  return definition;
}

export function getNormalizedPerspectiveFigures(): readonly NormalizedPerspectiveFigure[] {
  return NORMALIZED_PERSPECTIVE_FIGURES;
}

export function getNormalizedPerspectiveFigure(
  id: PerspectiveFigureId,
): NormalizedPerspectiveFigure {
  const definition = NORMALIZED_PERSPECTIVE_FIGURES.find((candidate) => candidate.id === id);
  if (!definition) {
    throw new Error(`Unknown perspective figure: ${String(id)}.`);
  }
  return definition;
}

export function transformNormalizedPoint(point: Point2, arena: ArenaSquare): Point2 {
  assertArena(arena);
  return {
    x: arena.x + point.x * arena.size,
    y: arena.y + point.y * arena.size,
  };
}

export function transformPerspectiveFigure(
  definition: NormalizedPerspectiveFigure,
  arena: ArenaSquare,
): PerspectiveFigure {
  assertArena(arena);
  return {
    id: definition.id,
    vertices: definition.vertices.map((point) => transformNormalizedPoint(point, arena)),
  };
}

export function transformPerspectiveFigures(arena: ArenaSquare): readonly PerspectiveFigure[] {
  assertArena(arena);
  return NORMALIZED_PERSPECTIVE_FIGURES.map((definition) =>
    transformPerspectiveFigure(definition, arena),
  );
}

export function signedPolygonArea(polygon: readonly Point2[]): number {
  if (polygon.length < 3) {
    return 0;
  }

  let doubledArea = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    doubledArea += current.x * next.y - next.x * current.y;
  }

  return doubledArea / 2;
}

export function polygonArea(polygon: readonly Point2[]): number {
  return Math.abs(signedPolygonArea(polygon));
}

export function polygonCentroid(polygon: readonly Point2[]): Point2 {
  const signedArea = signedPolygonArea(polygon);
  if (Math.abs(signedArea) <= EPSILON) {
    throw new Error("Cannot calculate the centroid of a degenerate polygon.");
  }

  let weightedX = 0;
  let weightedY = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index];
    const next = polygon[(index + 1) % polygon.length];
    const weight = current.x * next.y - next.x * current.y;
    weightedX += (current.x + next.x) * weight;
    weightedY += (current.y + next.y) * weight;
  }

  const denominator = 6 * signedArea;
  return {
    x: weightedX / denominator,
    y: weightedY / denominator,
  };
}

export function isConvexPolygon(polygon: readonly Point2[]): boolean {
  if (polygon.length < 3 || polygonArea(polygon) <= EPSILON) {
    return false;
  }

  let direction = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const previous = polygon[index];
    const current = polygon[(index + 1) % polygon.length];
    const next = polygon[(index + 2) % polygon.length];
    const turn = cross(subtract(current, previous), subtract(next, current));

    if (Math.abs(turn) <= EPSILON) {
      continue;
    }

    const currentDirection = Math.sign(turn);
    if (direction !== 0 && currentDirection !== direction) {
      return false;
    }
    direction = currentDirection;
  }

  return direction !== 0;
}

export function pointInConvexPolygon(
  point: Point2,
  polygon: readonly Point2[],
  safeSideTolerance = 0,
): boolean {
  if (polygon.length < 3 || polygonArea(polygon) <= EPSILON) {
    return false;
  }

  const orientation = Math.sign(signedPolygonArea(polygon));
  const tolerance = Math.max(0, safeSideTolerance);

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const edge = subtract(end, start);
    const edgeLength = Math.hypot(edge.x, edge.y);
    if (edgeLength <= EPSILON) {
      continue;
    }

    const signedDistance = (orientation * cross(edge, subtract(point, start))) / edgeLength;
    if (signedDistance < -tolerance - EPSILON) {
      return false;
    }
  }

  return true;
}

export function distanceFromPointToPolygon(
  point: Point2,
  polygon: readonly Point2[],
): number {
  assertUsablePolygon(polygon, "target polygon");
  if (pointInConvexPolygon(point, polygon)) {
    return 0;
  }

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    minimumDistance = Math.min(
      minimumDistance,
      distanceFromPointToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]),
    );
  }
  return minimumDistance;
}

export function minimumDistanceBetweenPolygons(
  first: readonly Point2[],
  second: readonly Point2[],
): number {
  assertUsablePolygon(first, "first polygon");
  assertUsablePolygon(second, "second polygon");

  if (pointInConvexPolygon(first[0], second) || pointInConvexPolygon(second[0], first)) {
    return 0;
  }

  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstStart = first[firstIndex];
    const firstEnd = first[(firstIndex + 1) % first.length];

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondStart = second[secondIndex];
      const secondEnd = second[(secondIndex + 1) % second.length];
      minimumDistance = Math.min(
        minimumDistance,
        distanceBetweenSegments(firstStart, firstEnd, secondStart, secondEnd),
      );
      if (minimumDistance <= EPSILON) {
        return 0;
      }
    }
  }

  return minimumDistance;
}

export function worstDistanceBetweenPolygons(
  current: readonly Point2[],
  next: readonly Point2[],
): number {
  assertUsablePolygon(current, "current polygon");
  assertUsablePolygon(next, "next polygon");

  return Math.max(...current.map((point) => distanceFromPointToPolygon(point, next)));
}

export function getPolygonPathPrefix(
  polygon: readonly Point2[],
  progress: number,
): readonly Point2[] {
  if (polygon.length === 0) {
    return [];
  }
  if (polygon.length === 1) {
    return [polygon[0]];
  }

  const edgeLengths = polygon.map((start, index) =>
    Math.hypot(
      polygon[(index + 1) % polygon.length].x - start.x,
      polygon[(index + 1) % polygon.length].y - start.y,
    ),
  );
  const perimeter = edgeLengths.reduce((total, length) => total + length, 0);
  if (perimeter <= EPSILON) {
    return [polygon[0]];
  }

  const normalizedProgress = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  if (normalizedProgress <= 0) {
    return [polygon[0]];
  }
  if (normalizedProgress >= 1) {
    return [...polygon, polygon[0]];
  }

  let remainingLength = perimeter * normalizedProgress;
  const prefix: Point2[] = [polygon[0]];

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const edgeLength = edgeLengths[index];

    if (edgeLength <= EPSILON) {
      continue;
    }
    if (remainingLength >= edgeLength - EPSILON) {
      prefix.push(end);
      remainingLength -= edgeLength;
      if (remainingLength <= EPSILON) {
        break;
      }
      continue;
    }

    prefix.push(lerpPoint(start, end, remainingLength / edgeLength));
    break;
  }

  return prefix;
}

export function buildArenaExteriorBands(
  arena: ArenaSquare,
  safezone: readonly Point2[],
): readonly (readonly Point2[])[] {
  assertArena(arena);
  if (!isConvexPolygon(safezone)) {
    throw new Error("Safezone must be a non-degenerate convex polygon.");
  }
  assertPolygonInsideArena(safezone, arena);

  const arenaLeft = arena.x;
  const arenaRight = arena.x + arena.size;
  const arenaTop = arena.y;
  const arenaBottom = arena.y + arena.size;
  const xBreakpoints = uniqueSortedNumbers([
    arenaLeft,
    ...safezone.map(({ x }) => x),
    arenaRight,
  ]);
  const bands: Point2[][] = [];

  for (let index = 0; index < xBreakpoints.length - 1; index += 1) {
    const left = xBreakpoints[index];
    const right = xBreakpoints[index + 1];
    if (right - left <= EPSILON) {
      continue;
    }

    const middleRange = verticalPolygonRangeAtX(safezone, (left + right) / 2);
    if (!middleRange) {
      addNonDegenerateBand(bands, [
        { x: left, y: arenaTop },
        { x: right, y: arenaTop },
        { x: right, y: arenaBottom },
        { x: left, y: arenaBottom },
      ]);
      continue;
    }

    const leftRange = verticalPolygonRangeAtX(safezone, left);
    const rightRange = verticalPolygonRangeAtX(safezone, right);
    if (!leftRange || !rightRange) {
      throw new Error("Safezone could not be decomposed into vertical exterior bands.");
    }

    addNonDegenerateBand(bands, [
      { x: left, y: arenaTop },
      { x: right, y: arenaTop },
      { x: right, y: rightRange.minimum },
      { x: left, y: leftRange.minimum },
    ]);
    addNonDegenerateBand(bands, [
      { x: left, y: leftRange.maximum },
      { x: right, y: rightRange.maximum },
      { x: right, y: arenaBottom },
      { x: left, y: arenaBottom },
    ]);
  }

  return bands;
}

export function subtractConvexPolygonFromSegment(
  start: Point2,
  end: Point2,
  polygon: readonly Point2[],
): readonly Segment2[] {
  if (!isConvexPolygon(polygon)) {
    throw new Error("Hatch clipping requires a non-degenerate convex polygon.");
  }

  if (Math.hypot(end.x - start.x, end.y - start.y) <= EPSILON) {
    return pointInConvexPolygon(start, polygon) ? [] : [[start, end]];
  }

  const orientation = Math.sign(signedPolygonArea(polygon));
  let entering = 0;
  let leaving = 1;

  for (let index = 0; index < polygon.length; index += 1) {
    const edgeStart = polygon[index];
    const edgeEnd = polygon[(index + 1) % polygon.length];
    const edge = subtract(edgeEnd, edgeStart);
    const edgeLength = Math.hypot(edge.x, edge.y);
    if (edgeLength <= EPSILON) {
      continue;
    }

    const startDistance =
      (orientation * cross(edge, subtract(start, edgeStart))) / edgeLength;
    const endDistance = (orientation * cross(edge, subtract(end, edgeStart))) / edgeLength;
    const distanceChange = endDistance - startDistance;

    if (Math.abs(distanceChange) <= EPSILON) {
      if (startDistance < -EPSILON) {
        return [[start, end]];
      }
      continue;
    }

    const crossing = -startDistance / distanceChange;
    if (distanceChange > 0) {
      entering = Math.max(entering, crossing);
    } else {
      leaving = Math.min(leaving, crossing);
    }

    if (entering - leaving > EPSILON) {
      return [[start, end]];
    }
  }

  if (leaving < -EPSILON || entering > 1 + EPSILON) {
    return [[start, end]];
  }

  entering = clamp(entering, 0, 1);
  leaving = clamp(leaving, 0, 1);
  const exterior: Segment2[] = [];

  if (entering > EPSILON) {
    exterior.push([start, lerpPoint(start, end, entering)]);
  }
  if (leaving < 1 - EPSILON) {
    exterior.push([lerpPoint(start, end, leaving), end]);
  }

  return exterior;
}

export function validatePerspectiveGeometry(
  figures: readonly PerspectiveFigure[],
  arena: ArenaSquare,
): void {
  assertArena(arena);
  if (figures.length !== FIGURE_IDS.length) {
    throw new Error(`Perspective geometry must contain exactly ${FIGURE_IDS.length} figures.`);
  }

  const figuresById = new Map<PerspectiveFigureId, PerspectiveFigure>();
  for (const figure of figures) {
    if (!FIGURE_IDS.includes(figure.id) || figuresById.has(figure.id)) {
      throw new Error(`Perspective figure ${String(figure.id)} is unknown or duplicated.`);
    }
    figuresById.set(figure.id, figure);
  }

  for (const id of FIGURE_IDS) {
    const figure = figuresById.get(id);
    if (!figure) {
      throw new Error(`Perspective figure ${id} is missing.`);
    }
    if (figure.vertices.length !== CONTOUR_SAMPLE_COUNT) {
      throw new Error(`Perspective figure ${id} must contain ${CONTOUR_SAMPLE_COUNT} samples.`);
    }
    if (!figure.vertices.every(isFinitePoint)) {
      throw new Error(`Perspective figure ${id} has a non-finite vertex.`);
    }
    if (
      signedPolygonArea(figure.vertices) <= EPSILON ||
      !isConvexPolygon(figure.vertices) ||
      hasSelfIntersections(figure.vertices)
    ) {
      throw new Error(`Perspective figure ${id} must be clockwise, convex, simple, and non-degenerate.`);
    }

    assertPolygonInsideArena(figure.vertices, arena);

    const centroid = polygonCentroid(figure.vertices);
    const centroidClearance = minimumDistanceToPolygonBoundary(centroid, figure.vertices);
    if (centroidClearance + EPSILON < playerRadiusForArena(arena.size) * 5) {
      throw new Error(`Perspective figure ${id} has insufficient centroid clearance.`);
    }

    const exterior = buildArenaExteriorBands(arena, figure.vertices);
    const exteriorArea = exterior.reduce((total, band) => total + polygonArea(band), 0);
    const expectedExteriorArea = arena.size ** 2 - polygonArea(figure.vertices);
    const areaTolerance = Math.max(1e-6, arena.size ** 2 * 1e-10);
    if (Math.abs(exteriorArea - expectedExteriorArea) > areaTolerance) {
      throw new Error(`Perspective figure ${id} produced an invalid arena exterior.`);
    }

    for (const corner of arenaCorners(arena)) {
      if (pointInConvexPolygon(corner, figure.vertices, SAFE_SIDE_TOLERANCE)) {
        throw new Error(`Perspective figure ${id} leaves an arena corner safe.`);
      }
    }
  }

  const requiredSeparation = playerRadiusForArena(arena.size) * 2 + SAFE_SIDE_TOLERANCE * 2;
  for (let firstIndex = 0; firstIndex < FIGURE_IDS.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < FIGURE_IDS.length; secondIndex += 1) {
      const first = figuresById.get(FIGURE_IDS[firstIndex]);
      const second = figuresById.get(FIGURE_IDS[secondIndex]);
      if (!first || !second) {
        throw new Error("Perspective geometry is incomplete.");
      }

      const separation = minimumDistanceBetweenPolygons(first.vertices, second.vertices);
      if (separation + EPSILON < requiredSeparation) {
        throw new Error(`Perspective figures ${first.id} and ${second.id} are not separated.`);
      }
    }
  }
}

function distanceFromPointToSegment(point: Point2, start: Point2, end: Point2): number {
  const segment = subtract(end, start);
  const lengthSquared = segment.x * segment.x + segment.y * segment.y;
  if (lengthSquared <= EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const projection = subtract(point, start);
  const ratio = clamp(
    (projection.x * segment.x + projection.y * segment.y) / lengthSquared,
    0,
    1,
  );
  const closest = {
    x: start.x + segment.x * ratio,
    y: start.y + segment.y * ratio,
  };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

function distanceBetweenSegments(
  firstStart: Point2,
  firstEnd: Point2,
  secondStart: Point2,
  secondEnd: Point2,
): number {
  if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
    return 0;
  }

  return Math.min(
    distanceFromPointToSegment(firstStart, secondStart, secondEnd),
    distanceFromPointToSegment(firstEnd, secondStart, secondEnd),
    distanceFromPointToSegment(secondStart, firstStart, firstEnd),
    distanceFromPointToSegment(secondEnd, firstStart, firstEnd),
  );
}

function segmentsIntersect(
  firstStart: Point2,
  firstEnd: Point2,
  secondStart: Point2,
  secondEnd: Point2,
): boolean {
  const firstDirection = subtract(firstEnd, firstStart);
  const secondDirection = subtract(secondEnd, secondStart);
  const denominator = cross(firstDirection, secondDirection);
  const offset = subtract(secondStart, firstStart);

  if (Math.abs(denominator) <= EPSILON) {
    if (Math.abs(cross(offset, firstDirection)) > EPSILON) {
      return false;
    }
    return rangesOverlap(firstStart.x, firstEnd.x, secondStart.x, secondEnd.x) &&
      rangesOverlap(firstStart.y, firstEnd.y, secondStart.y, secondEnd.y);
  }

  const firstRatio = cross(offset, secondDirection) / denominator;
  const secondRatio = cross(offset, firstDirection) / denominator;
  return (
    firstRatio >= -EPSILON &&
    firstRatio <= 1 + EPSILON &&
    secondRatio >= -EPSILON &&
    secondRatio <= 1 + EPSILON
  );
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
): boolean {
  return (
    Math.max(Math.min(firstStart, firstEnd), Math.min(secondStart, secondEnd)) <=
    Math.min(Math.max(firstStart, firstEnd), Math.max(secondStart, secondEnd)) + EPSILON
  );
}

function minimumDistanceToPolygonBoundary(point: Point2, polygon: readonly Point2[]): number {
  return Math.min(
    ...polygon.map((start, index) =>
      distanceFromPointToSegment(point, start, polygon[(index + 1) % polygon.length]),
    ),
  );
}

function verticalPolygonRangeAtX(
  polygon: readonly Point2[],
  x: number,
): { readonly minimum: number; readonly maximum: number } | null {
  const intersections: number[] = [];

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const deltaX = end.x - start.x;

    if (Math.abs(deltaX) <= EPSILON) {
      if (Math.abs(x - start.x) <= EPSILON) {
        intersections.push(start.y, end.y);
      }
      continue;
    }

    const ratio = (x - start.x) / deltaX;
    if (ratio >= -EPSILON && ratio <= 1 + EPSILON) {
      intersections.push(start.y + (end.y - start.y) * clamp(ratio, 0, 1));
    }
  }

  if (intersections.length === 0) {
    return null;
  }
  return {
    minimum: Math.min(...intersections),
    maximum: Math.max(...intersections),
  };
}

function addNonDegenerateBand(bands: Point2[][], candidate: readonly Point2[]): void {
  const band = removeDuplicateVertices(candidate);
  if (band.length >= 3 && polygonArea(band) > EPSILON) {
    bands.push(band);
  }
}

function removeDuplicateVertices(polygon: readonly Point2[]): Point2[] {
  const result: Point2[] = [];
  for (const point of polygon) {
    const previous = result[result.length - 1];
    if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > EPSILON) {
      result.push(point);
    }
  }

  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= EPSILON) {
      result.pop();
    }
  }

  return result;
}

function uniqueSortedNumbers(values: readonly number[]): readonly number[] {
  const sorted = [...values].sort((first, second) => first - second);
  const unique: number[] = [];

  for (const value of sorted) {
    const previous = unique[unique.length - 1];
    if (previous === undefined || Math.abs(value - previous) > EPSILON) {
      unique.push(value);
    }
  }
  return unique;
}

function lerpPoint(start: Point2, end: Point2, ratio: number): Point2 {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function arenaCorners(arena: ArenaSquare): readonly Point2[] {
  return [
    { x: arena.x, y: arena.y },
    { x: arena.x + arena.size, y: arena.y },
    { x: arena.x + arena.size, y: arena.y + arena.size },
    { x: arena.x, y: arena.y + arena.size },
  ];
}

function assertUsablePolygon(polygon: readonly Point2[], name: string): void {
  if (polygon.length < 3 || !polygon.every(isFinitePoint) || polygonArea(polygon) <= EPSILON) {
    throw new Error(`${name} must be a finite, non-degenerate polygon.`);
  }
}

function assertPolygonInsideArena(polygon: readonly Point2[], arena: ArenaSquare): void {
  const right = arena.x + arena.size;
  const bottom = arena.y + arena.size;
  for (const vertex of polygon) {
    if (
      vertex.x < arena.x - EPSILON ||
      vertex.x > right + EPSILON ||
      vertex.y < arena.y - EPSILON ||
      vertex.y > bottom + EPSILON
    ) {
      throw new Error("Perspective polygon must remain inside the arena.");
    }
  }
}

function isFinitePoint(point: Point2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function subtract(first: Point2, second: Point2): Point2 {
  return { x: first.x - second.x, y: first.y - second.y };
}

function cross(first: Point2, second: Point2): number {
  return first.x * second.y - first.y * second.x;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertArena(arena: ArenaSquare): void {
  if (!Number.isFinite(arena.x) || !Number.isFinite(arena.y) || !Number.isFinite(arena.size)) {
    throw new Error("Arena coordinates and size must be finite numbers.");
  }
  if (arena.size <= 0) {
    throw new Error("Arena size must be greater than zero.");
  }
}
