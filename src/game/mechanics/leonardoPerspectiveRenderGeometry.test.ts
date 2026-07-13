import { describe, expect, it } from "vitest";

import {
  getPolygonPathPrefix,
  pointInConvexPolygon,
  transformPerspectiveFigures,
  type ArenaSquare,
  type Point2,
  type Segment2,
} from "./leonardoPerspectiveGeometry";
import {
  PERSPECTIVE_GUIDE_STUDY_COVERAGE,
  PERSPECTIVE_IRREGULAR_STUDY_COVERAGE,
  PERSPECTIVE_STUDY_MAX_OFFSET_RATIO,
  buildDashedPolylineSegments,
  buildPerspectiveRenderGeometry,
  buildPerspectiveStudyPaths,
  buildWarningHatchSegments,
} from "./leonardoPerspectiveRenderGeometry";

const ARENA: ArenaSquare = { x: 28, y: 112, size: 300 };
const EPSILON = 1e-7;

function polylineLength(points: readonly Point2[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    );
  }
  return length;
}

function polygonPerimeter(points: readonly Point2[]): number {
  return points.reduce((length, point, index) => {
    const next = points[(index + 1) % points.length];
    return length + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);
}

function cross(first: Point2, second: Point2, third: Point2): number {
  return (
    (second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x)
  );
}

function segmentsProperlyIntersect(first: Segment2, second: Segment2): boolean {
  const firstA = cross(first[0], first[1], second[0]);
  const firstB = cross(first[0], first[1], second[1]);
  const secondA = cross(second[0], second[1], first[0]);
  const secondB = cross(second[0], second[1], first[1]);
  return firstA * firstB < -EPSILON && secondA * secondB < -EPSILON;
}

function openPathSegments(points: readonly Point2[]): readonly Segment2[] {
  return points.slice(1).map((point, index) => [points[index], point] as const);
}

function hasSelfIntersection(points: readonly Point2[]): boolean {
  const segments = openPathSegments(points);
  return segments.some((segment, firstIndex) =>
    segments.some(
      (candidate, secondIndex) =>
        secondIndex > firstIndex + 1 && segmentsProperlyIntersect(segment, candidate),
    ),
  );
}

function expectPointClose(actual: Point2, expected: Point2): void {
  expect(actual.x).toBeCloseTo(expected.x, 8);
  expect(actual.y).toBeCloseTo(expected.y, 8);
}

describe("buildPerspectiveStudyPaths", () => {
  it("builds deterministic open studies at the approved 62% and 93% coverages", () => {
    for (const figure of transformPerspectiveFigures(ARENA)) {
      const studies = buildPerspectiveStudyPaths(ARENA, figure);

      expect(buildPerspectiveStudyPaths(ARENA, figure)).toEqual(studies);
      expect(studies.irregular.coverage).toBe(PERSPECTIVE_IRREGULAR_STUDY_COVERAGE);
      expect(studies.guide.coverage).toBe(PERSPECTIVE_GUIDE_STUDY_COVERAGE);
      expect(studies.irregular.closed).toBe(false);
      expect(studies.guide.closed).toBe(false);

      for (const study of [studies.irregular, studies.guide]) {
        expect(study.points.length).toBeGreaterThan(1);
        expect(study.points.at(-1)).not.toEqual(study.points[0]);
      }

      const perimeter = polygonPerimeter(figure.vertices);
      expect(polylineLength(studies.irregular.points) / perimeter).toBeGreaterThanOrEqual(0.55);
      expect(polylineLength(studies.irregular.points) / perimeter).toBeLessThanOrEqual(0.7);
      expect(polylineLength(studies.guide.points) / perimeter).toBeGreaterThanOrEqual(0.9);
      expect(polylineLength(studies.guide.points) / perimeter).toBeLessThanOrEqual(0.95);
    }
  });

  it("keeps offsets smooth, limited, and free of crossings", () => {
    for (const figure of transformPerspectiveFigures(ARENA)) {
      const studies = buildPerspectiveStudyPaths(ARENA, figure);

      for (const study of [studies.irregular, studies.guide]) {
        const canonical = getPolygonPathPrefix(figure.vertices, study.coverage);
        const offsets = study.points.map((point, index) =>
          Math.hypot(point.x - canonical[index].x, point.y - canonical[index].y),
        );

        expect(study.points).toHaveLength(canonical.length);
        expect(Math.max(...offsets)).toBeLessThanOrEqual(
          ARENA.size * PERSPECTIVE_STUDY_MAX_OFFSET_RATIO + EPSILON,
        );
        for (let index = 1; index < offsets.length; index += 1) {
          expect(Math.abs(offsets[index] - offsets[index - 1])).toBeLessThanOrEqual(
            ARENA.size * 0.006,
          );
        }
        expect(hasSelfIntersection(study.points)).toBe(false);
      }

      const irregularSegments = openPathSegments(studies.irregular.points);
      const guideSegments = openPathSegments(studies.guide.points);
      expect(
        irregularSegments.some((segment) =>
          guideSegments.some((candidate) => segmentsProperlyIntersect(segment, candidate)),
        ),
      ).toBe(false);
    }
  });

  it("scales and repositions both studies with the arena", () => {
    const resized: ArenaSquare = { x: 110, y: 340, size: 600 };
    const sourceFigure = transformPerspectiveFigures(ARENA)[1];
    const resizedFigure = transformPerspectiveFigures(resized)[1];
    const source = buildPerspectiveStudyPaths(ARENA, sourceFigure);
    const target = buildPerspectiveStudyPaths(resized, resizedFigure);

    for (const key of ["irregular", "guide"] as const) {
      expect(target[key].points).toHaveLength(source[key].points.length);
      target[key].points.forEach((point, index) => {
        const sourcePoint = source[key].points[index];
        expectPointClose(
          { x: (point.x - resized.x) / resized.size, y: (point.y - resized.y) / resized.size },
          {
            x: (sourcePoint.x - ARENA.x) / ARENA.size,
            y: (sourcePoint.y - ARENA.y) / ARENA.size,
          },
        );
      });
    }
  });
});

describe("buildDashedPolylineSegments", () => {
  it("keeps one dash phase through polyline vertices", () => {
    const path: readonly Point2[] = [
      { x: 0, y: 0 },
      { x: 7, y: 0 },
      { x: 7, y: 7 },
    ];

    const segments = buildDashedPolylineSegments(path, 4, 2);

    expect(segments).toEqual([
      [{ x: 0, y: 0 }, { x: 4, y: 0 }],
      [{ x: 6, y: 0 }, { x: 7, y: 0 }],
      [{ x: 7, y: 0 }, { x: 7, y: 3 }],
      [{ x: 7, y: 5 }, { x: 7, y: 7 }],
    ]);
  });
});

describe("buildWarningHatchSegments", () => {
  it("builds deterministic diagonal segments whose midpoints stay outside the safezone", () => {
    for (const figure of transformPerspectiveFigures(ARENA)) {
      const segments = buildWarningHatchSegments(ARENA, figure.vertices);

      expect(segments.length).toBeGreaterThan(0);
      expect(buildWarningHatchSegments(ARENA, figure.vertices)).toEqual(segments);
      for (const [start, end] of segments) {
        expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeGreaterThan(EPSILON);
        expect(
          pointInConvexPolygon(
            { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
            figure.vertices,
          ),
        ).toBe(false);
      }
    }
  });
});

describe("buildPerspectiveRenderGeometry", () => {
  it("preserves the canonical contour by identity and bundles every cached visual derivation", () => {
    const figure = transformPerspectiveFigures(ARENA)[0];
    const bundle = buildPerspectiveRenderGeometry(ARENA, figure);

    expect(bundle.contour).toBe(figure.vertices);
    expect(bundle.studies.irregular.points.length).toBeGreaterThan(1);
    expect(bundle.studies.guide.points.length).toBeGreaterThan(1);
    expect(bundle.dashedGuideSegments.length).toBeGreaterThan(0);
    expect(bundle.warningHatchSegments.length).toBeGreaterThan(0);
    expect(bundle.exteriorBands.length).toBeGreaterThan(0);
    expect(buildPerspectiveRenderGeometry(ARENA, figure)).toEqual(bundle);
  });
});
