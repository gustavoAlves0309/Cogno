import { describe, expect, it } from "vitest";

import {
  buildCanonicalNormalizedContour,
  buildArenaExteriorBands,
  chaikinClosed,
  getNormalizedPerspectiveDefinition,
  getNormalizedPerspectiveDefinitions,
  getNormalizedPerspectiveFigure,
  getNormalizedPerspectiveFigures,
  getPolygonPathPrefix,
  hasSelfIntersections,
  isConvexPolygon,
  minimumDistanceBetweenPolygons,
  playerMaxSpeedForArena,
  playerRadiusForArena,
  pointInConvexPolygon,
  polygonArea,
  polygonCentroid,
  resampleClosedPathByArcLength,
  signedPolygonArea,
  subtractConvexPolygonFromSegment,
  transformPerspectiveFigures,
  validatePerspectiveGeometry,
  worstDistanceBetweenPolygons,
  type ArenaSquare,
  type PerspectiveFigure,
  type PerspectiveFigureId,
  type Point2,
} from "./leonardoPerspectiveGeometry";

const MOBILE_ARENAS: readonly ArenaSquare[] = [
  { x: 54, y: 326, size: 212 },
  { x: 50, y: 318, size: 260 },
  { x: 48, y: 304, size: 274 },
  { x: 18, y: 96, size: 280 },
  { x: 27, y: 112, size: 330 },
];

const FIGURE_IDS: readonly PerspectiveFigureId[] = ["A", "B", "C"];
const LEGACY_VERTICES: Readonly<Record<PerspectiveFigureId, readonly Point2[]>> = {
  A: [
    { x: 0.05, y: 0.12 },
    { x: 0.43, y: 0.16 },
    { x: 0.39, y: 0.48 },
    { x: 0.1, y: 0.46 },
  ],
  B: [
    { x: 0.58, y: 0.59 },
    { x: 0.86, y: 0.61 },
    { x: 0.93, y: 0.78 },
    { x: 0.75, y: 0.94 },
    { x: 0.5, y: 0.83 },
  ],
  C: [
    { x: 0.57, y: 0.08 },
    { x: 0.78, y: 0.07 },
    { x: 0.94, y: 0.18 },
    { x: 0.9, y: 0.38 },
    { x: 0.69, y: 0.46 },
    { x: 0.52, y: 0.31 },
  ],
};

const LEGACY_AREAS: Readonly<Record<PerspectiveFigureId, number>> = {
  A: 0.1104,
  B: 0.1026,
  C: 0.11935,
};

function arenaPolygon(arena: ArenaSquare): readonly Point2[] {
  return [
    { x: arena.x, y: arena.y },
    { x: arena.x + arena.size, y: arena.y },
    { x: arena.x + arena.size, y: arena.y + arena.size },
    { x: arena.x, y: arena.y + arena.size },
  ];
}

function distanceFromPointToSegment(point: Point2, start: Point2, end: Point2): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
        );

  return Math.hypot(
    point.x - (start.x + dx * projection),
    point.y - (start.y + dy * projection),
  );
}

function clearanceFromBoundary(point: Point2, polygon: readonly Point2[]): number {
  return Math.min(
    ...polygon.map((start, index) =>
      distanceFromPointToSegment(point, start, polygon[(index + 1) % polygon.length]),
    ),
  );
}

function replaceFigure(
  figures: readonly PerspectiveFigure[],
  id: PerspectiveFigureId,
  vertices: readonly Point2[],
): readonly PerspectiveFigure[] {
  return figures.map((figure) => (figure.id === id ? { id, vertices } : figure));
}

function boundingBox(points: readonly Point2[]): {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
} {
  return {
    minimumX: Math.min(...points.map(({ x }) => x)),
    maximumX: Math.max(...points.map(({ x }) => x)),
    minimumY: Math.min(...points.map(({ y }) => y)),
    maximumY: Math.max(...points.map(({ y }) => y)),
  };
}

describe("shared player metrics", () => {
  it("matches the canonical radius and maximum-speed clamps", () => {
    expect(playerRadiusForArena(100)).toBe(5.3);
    expect(playerRadiusForArena(320)).toBeCloseTo(6.4);
    expect(playerRadiusForArena(500)).toBe(7.4);
    expect(playerMaxSpeedForArena(100)).toBe(190);
    expect(playerMaxSpeedForArena(320)).toBeCloseTo(249.6);
    expect(playerMaxSpeedForArena(500)).toBe(270);
  });
});

describe("convex-polygon collision", () => {
  const square: readonly Point2[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it("treats the border and the safe-side tolerance as safe", () => {
    expect(pointInConvexPolygon({ x: 0, y: 50 }, square)).toBe(true);
    expect(pointInConvexPolygon({ x: 50, y: 50 }, square)).toBe(true);
    expect(pointInConvexPolygon({ x: -0.01, y: 50 }, square)).toBe(false);
    expect(pointInConvexPolygon({ x: -1.99, y: 50 }, square, 2)).toBe(true);
    expect(pointInConvexPolygon({ x: -2.01, y: 50 }, square, 2)).toBe(false);
  });
});

describe("organic contour pipeline", () => {
  it("keeps eight finite, clockwise, convex authoring controls per figure", () => {
    const definitions = getNormalizedPerspectiveDefinitions();

    expect(definitions.map(({ id }) => id)).toEqual(FIGURE_IDS);
    for (const id of FIGURE_IDS) {
      const controls = getNormalizedPerspectiveDefinition(id).controlPoints;
      expect(controls).toHaveLength(8);
      expect(controls.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      expect(signedPolygonArea(controls)).toBeGreaterThan(0);
      expect(isConvexPolygon(controls)).toBe(true);
      expect(hasSelfIntersections(controls)).toBe(false);
    }
  });

  it("applies two closed Chaikin passes in stable edge order", () => {
    const square: readonly Point2[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];

    expect(chaikinClosed(square, 1)).toEqual([
      { x: 0.25, y: 0 },
      { x: 0.75, y: 0 },
      { x: 1, y: 0.25 },
      { x: 1, y: 0.75 },
      { x: 0.75, y: 1 },
      { x: 0.25, y: 1 },
      { x: 0, y: 0.75 },
      { x: 0, y: 0.25 },
    ]);
    expect(chaikinClosed(square, 2)).toHaveLength(16);
    expect(chaikinClosed(getNormalizedPerspectiveDefinition("A").controlPoints, 2)).toHaveLength(
      32,
    );
  });

  it("resamples a closed path uniformly without duplicating its first point", () => {
    const rectangle: readonly Point2[] = [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 2 },
      { x: 0, y: 2 },
    ];
    const samples = resampleClosedPathByArcLength(rectangle, 12);

    expect(samples).toHaveLength(12);
    expect(samples[0]).toEqual(rectangle[0]);
    expect(samples.at(-1)).not.toEqual(samples[0]);
    samples.forEach((sample, index) => {
      const next = samples[(index + 1) % samples.length];
      expect(Math.hypot(next.x - sample.x, next.y - sample.y)).toBeCloseTo(1, 12);
    });
  });

  it("builds forty deterministic samples with a stable start and traversal direction", () => {
    for (const id of FIGURE_IDS) {
      const controls = getNormalizedPerspectiveDefinition(id).controlPoints;
      const smoothed = chaikinClosed(controls, 2);
      const first = buildCanonicalNormalizedContour(controls);
      const second = buildCanonicalNormalizedContour(controls);

      expect(first).toEqual(second);
      expect(first).toHaveLength(40);
      expect(first[0]).toEqual(smoothed[0]);
      expect(first.at(-1)).not.toEqual(first[0]);
      expect(signedPolygonArea(first)).toBeGreaterThan(0);
      expect(isConvexPolygon(first)).toBe(true);
      expect(hasSelfIntersections(first)).toBe(false);
    }

    expect(() =>
      buildCanonicalNormalizedContour(
        getNormalizedPerspectiveDefinition("A").controlPoints.slice(1),
      ),
    ).toThrow();
  });

  it("detects non-adjacent crossings in closed paths", () => {
    expect(
      hasSelfIntersections([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toBe(true);
  });
});

describe("closed perspective figures", () => {
  it("keeps the legacy area, centroid, and bounding-box envelopes", () => {
    const figures = getNormalizedPerspectiveFigures();

    expect(figures.map(({ id }) => id)).toEqual(FIGURE_IDS);
    for (const id of FIGURE_IDS) {
      const figure = getNormalizedPerspectiveFigure(id);
      const legacyCentroid = polygonCentroid(LEGACY_VERTICES[id]);
      const centroid = polygonCentroid(figure.vertices);
      const legacyBounds = boundingBox(LEGACY_VERTICES[id]);

      expect(figure.vertices).toHaveLength(40);
      expect(Math.abs(polygonArea(figure.vertices) - LEGACY_AREAS[id])).toBeLessThanOrEqual(
        LEGACY_AREAS[id] * 0.1,
      );
      expect(Math.hypot(centroid.x - legacyCentroid.x, centroid.y - legacyCentroid.y)).toBeLessThanOrEqual(
        0.035,
      );
      for (const point of figure.vertices) {
        expect(point.x).toBeGreaterThanOrEqual(legacyBounds.minimumX - 0.03);
        expect(point.x).toBeLessThanOrEqual(legacyBounds.maximumX + 0.03);
        expect(point.y).toBeGreaterThanOrEqual(legacyBounds.minimumY - 0.03);
        expect(point.y).toBeLessThanOrEqual(legacyBounds.maximumY + 0.03);
      }
    }
  });

  it("keeps every transformed vertex inside the arena and rebuilds identically after resize", () => {
    for (const arena of MOBILE_ARENAS) {
      const figures = transformPerspectiveFigures(arena);
      expect(transformPerspectiveFigures(arena)).toEqual(figures);

      for (const figure of figures) {
        const normalized = getNormalizedPerspectiveFigure(figure.id);
        figure.vertices.forEach((vertex, index) => {
          expect(vertex.x).toBeGreaterThanOrEqual(arena.x);
          expect(vertex.x).toBeLessThanOrEqual(arena.x + arena.size);
          expect(vertex.y).toBeGreaterThanOrEqual(arena.y);
          expect(vertex.y).toBeLessThanOrEqual(arena.y + arena.size);
          expect((vertex.x - arena.x) / arena.size).toBeCloseTo(normalized.vertices[index].x, 12);
          expect((vertex.y - arena.y) / arena.size).toBeCloseTo(normalized.vertices[index].y, 12);
        });
      }
    }
  });

  it("leaves all four arena corners outside every figure, including tolerance 2", () => {
    for (const arena of MOBILE_ARENAS) {
      for (const figure of transformPerspectiveFigures(arena)) {
        for (const corner of arenaPolygon(arena)) {
          expect(pointInConvexPolygon(corner, figure.vertices, 2)).toBe(false);
        }
      }
    }
  });

  it("keeps every pair disjoint beyond a player diameter plus two tolerances", () => {
    for (const arena of MOBILE_ARENAS) {
      const figures = transformPerspectiveFigures(arena);
      const requiredGap = playerRadiusForArena(arena.size) * 2 + 4;

      for (let firstIndex = 0; firstIndex < figures.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < figures.length; secondIndex += 1) {
          const first = figures[firstIndex].vertices;
          const second = figures[secondIndex].vertices;
          const gap = minimumDistanceBetweenPolygons(first, second);

          expect(gap).toBeGreaterThan(requiredGap);
          expect(gap).toBeGreaterThan(4);
          expect(first.some((point) => pointInConvexPolygon(point, second, 2))).toBe(false);
          expect(second.some((point) => pointInConvexPolygon(point, first, 2))).toBe(false);
        }
      }
    }
  });

  it("preserves at least five player radii around every centroid", () => {
    for (const arena of MOBILE_ARENAS) {
      for (const figure of transformPerspectiveFigures(arena)) {
        const centroid = polygonCentroid(figure.vertices);

        expect(clearanceFromBoundary(centroid, figure.vertices)).toBeGreaterThanOrEqual(
          playerRadiusForArena(arena.size) * 5,
        );
      }
    }
  });

  it("keeps arena-to-A, A-to-B, and B-to-C reachable with a 250 ms reserve", () => {
    for (const arena of MOBILE_ARENAS) {
      const [figureA, figureB, figureC] = transformPerspectiveFigures(arena);
      const movementBudget = playerMaxSpeedForArena(arena.size) * (1.4 - 0.25);

      expect(worstDistanceBetweenPolygons(arenaPolygon(arena), figureA.vertices)).toBeLessThanOrEqual(
        movementBudget,
      );
      expect(worstDistanceBetweenPolygons(figureA.vertices, figureB.vertices)).toBeLessThanOrEqual(
        movementBudget,
      );
      expect(worstDistanceBetweenPolygons(figureB.vertices, figureC.vertices)).toBeLessThanOrEqual(
        movementBudget,
      );
    }
  });

  it("validates canonical geometry and rejects missing, degenerate, outside, or touching figures", () => {
    const arena = MOBILE_ARENAS[0];
    const figures = transformPerspectiveFigures(arena);

    expect(() => validatePerspectiveGeometry(figures, arena)).not.toThrow();
    expect(() => validatePerspectiveGeometry(figures.slice(1), arena)).toThrow();
    expect(() =>
      validatePerspectiveGeometry(
        replaceFigure(
          figures,
          "A",
          Array.from({ length: 40 }, (_, index) => ({ x: 80 + index, y: 360 })),
        ),
        arena,
      ),
    ).toThrow();
    expect(() =>
      validatePerspectiveGeometry(
        replaceFigure(figures, "A", [
          { ...figures[0].vertices[0], x: arena.x - 1 },
          ...figures[0].vertices.slice(1),
        ]),
        arena,
      ),
    ).toThrow();
    expect(() =>
      validatePerspectiveGeometry(
        replaceFigure(figures, "A", figures[1].vertices),
        arena,
      ),
    ).toThrow();
  });
});

describe("perimeter construction", () => {
  const rectangle: readonly Point2[] = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 6, y: 2 },
    { x: 0, y: 2 },
  ];

  it("returns a prefix based on perimeter length from 0% through 100%", () => {
    expect(getPolygonPathPrefix(rectangle, 0)).toEqual([{ x: 0, y: 0 }]);
    expect(getPolygonPathPrefix(rectangle, 0.25)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ]);
    expect(getPolygonPathPrefix(rectangle, 0.5)).toEqual([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 2 },
    ]);
    expect(getPolygonPathPrefix(rectangle, 1)).toEqual([...rectangle, rectangle[0]]);
  });
});

describe("arena exterior decomposition", () => {
  it("covers exactly arena area minus the safe figure without containing its centroid", () => {
    for (const arena of MOBILE_ARENAS) {
      for (const figure of transformPerspectiveFigures(arena)) {
        const exterior = buildArenaExteriorBands(arena, figure.vertices);
        const exteriorArea = exterior.reduce((total, band) => total + polygonArea(band), 0);
        const centroid = polygonCentroid(figure.vertices);

        expect(exteriorArea).toBeCloseTo(arena.size ** 2 - polygonArea(figure.vertices), 7);
        expect(exterior.length).toBeGreaterThan(0);
        for (const band of exterior) {
          expect(isConvexPolygon(band)).toBe(true);
          expect(pointInConvexPolygon(centroid, band)).toBe(false);
          expect(new Set(band.map(({ x }) => x.toFixed(8))).size).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

describe("hatch segment clipping", () => {
  const safeSquare: readonly Point2[] = [
    { x: 2, y: 2 },
    { x: 8, y: 2 },
    { x: 8, y: 8 },
    { x: 2, y: 8 },
  ];

  it("cuts crossing segments exactly at the safe boundary", () => {
    expect(
      subtractConvexPolygonFromSegment({ x: 0, y: 5 }, { x: 10, y: 5 }, safeSquare),
    ).toEqual([
      [
        { x: 0, y: 5 },
        { x: 2, y: 5 },
      ],
      [
        { x: 8, y: 5 },
        { x: 10, y: 5 },
      ],
    ]);
    expect(
      subtractConvexPolygonFromSegment({ x: 0, y: 0 }, { x: 10, y: 10 }, safeSquare),
    ).toEqual([
      [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ],
      [
        { x: 8, y: 8 },
        { x: 10, y: 10 },
      ],
    ]);
  });

  it("keeps fully exterior segments and removes fully interior segments", () => {
    expect(
      subtractConvexPolygonFromSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, safeSquare),
    ).toEqual([
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    ]);
    expect(
      subtractConvexPolygonFromSegment({ x: 3, y: 5 }, { x: 7, y: 5 }, safeSquare),
    ).toEqual([]);
  });
});
