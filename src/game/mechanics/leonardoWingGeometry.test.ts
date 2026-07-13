import { describe, expect, it } from "vitest";

import type { ArenaSquare, Point2 } from "./leonardoPerspectiveGeometry";
import type { WingProfile } from "./leonardoWingTimeline";
import {
  buildWingGeometry,
  circleIntersectsWingPanels,
  getWingArenaSignature,
  getWingPassFrame,
  type WingGeometry,
  type WingPassGeometry,
} from "./leonardoWingGeometry";

const ARENAS: readonly ArenaSquare[] = [
  { x: 74, y: 198, size: 212 },
  { x: 50, y: 214, size: 260 },
  { x: 43, y: 196, size: 274 },
  { x: 55, y: 228, size: 280 },
  { x: 30, y: 180, size: 330 },
];
const PROFILES: readonly WingProfile[] = ["v1", "v2", "v3-intro", "v3-mature"];

function geometry(arena: ArenaSquare, profile: WingProfile): WingGeometry {
  const result = buildWingGeometry(arena, profile);
  expect(result).not.toBeNull();
  return result as WingGeometry;
}

function dot(first: Point2, second: Point2): number {
  return first.x * second.x + first.y * second.y;
}

function add(first: Point2, second: Point2): Point2 {
  return { x: first.x + second.x, y: first.y + second.y };
}

function scale(point: Point2, factor: number): Point2 {
  return { x: point.x * factor, y: point.y * factor };
}

function arenaCorners(arena: ArenaSquare): readonly Point2[] {
  return [
    { x: arena.x, y: arena.y },
    { x: arena.x + arena.size, y: arena.y },
    { x: arena.x + arena.size, y: arena.y + arena.size },
    { x: arena.x, y: arena.y + arena.size },
  ];
}

function progressAtPoint(pass: WingPassGeometry, point: Point2): number {
  const start = dot(pass.travelStart, pass.basis.travelAxis);
  const end = dot(pass.travelEnd, pass.basis.travelAxis);
  return (dot(point, pass.basis.travelAxis) - start) / (end - start);
}

function safeCorridorsIntersect(
  first: WingPassGeometry,
  second: WingPassGeometry,
  playerRadius: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): boolean {
  let polygon: Point2[] = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];

  for (const pass of [first, second]) {
    const safeHalfWidth = pass.gap.halfWidth - playerRadius;
    const centerProjection = dot(pass.gapCenterAtArenaCenter, pass.basis.spanAxis);
    polygon = clipToProjection(
      polygon,
      pass.basis.spanAxis,
      centerProjection - safeHalfWidth,
      true,
    );
    polygon = clipToProjection(
      polygon,
      pass.basis.spanAxis,
      centerProjection + safeHalfWidth,
      false,
    );
    if (polygon.length === 0) {
      return false;
    }
  }
  return true;
}

function clipToProjection(
  points: readonly Point2[],
  axis: Point2,
  boundary: number,
  keepGreater: boolean,
): Point2[] {
  if (points.length === 0) {
    return [];
  }
  const result: Point2[] = [];
  const signedDistance = (point: Point2): number =>
    (dot(point, axis) - boundary) * (keepGreater ? 1 : -1);
  let previous = points[points.length - 1];
  let previousDistance = signedDistance(previous);

  for (const current of points) {
    const currentDistance = signedDistance(current);
    const previousInside = previousDistance >= -1e-9;
    const currentInside = currentDistance >= -1e-9;
    if (previousInside !== currentInside) {
      const progress = previousDistance / (previousDistance - currentDistance);
      result.push({
        x: previous.x + (current.x - previous.x) * progress,
        y: previous.y + (current.y - previous.y) * progress,
      });
    }
    if (currentInside) {
      result.push(current);
    }
    previous = current;
    previousDistance = currentDistance;
  }
  return result;
}

describe("Leonardo wing canonical geometry", () => {
  it("builds every profile at all approved arena sizes and offsets", () => {
    for (const arena of ARENAS) {
      for (const profile of PROFILES) {
        const result = geometry(arena, profile);
        expect(result.passes).toHaveLength(profile === "v1" ? 2 : 3);
        expect(result.arenaSignature).toBe(getWingArenaSignature(arena));
      }
    }
  });

  it("uses the exact opening widths expressed in player diameters", () => {
    const expected = { v1: 3, v2: 2.5, "v3-intro": 2.2, "v3-mature": 2.2 } as const;

    for (const profile of PROFILES) {
      const result = geometry(ARENAS[2], profile);
      for (const pass of result.passes) {
        const widthInDiameters = (pass.gap.halfWidth * 2) / (result.playerRadius * 2);
        expect(widthInDiameters).toBeCloseTo(expected[profile], 12);
        expect(pass.gap.normalizedCenter).toBe(pass.definition.gapCenter);
      }
    }
  });

  it("constructs orthonormal down, up, and fixed 20-degree diagonal bases", () => {
    const passes = geometry(ARENAS[4], "v3-intro").passes;

    expect(passes.map((pass) => pass.direction)).toEqual(["down", "up", "diagonal"]);
    for (const pass of passes) {
      expect(Math.hypot(pass.basis.travelAxis.x, pass.basis.travelAxis.y)).toBeCloseTo(1, 12);
      expect(Math.hypot(pass.basis.spanAxis.x, pass.basis.spanAxis.y)).toBeCloseTo(1, 12);
      expect(dot(pass.basis.travelAxis, pass.basis.spanAxis)).toBeCloseTo(0, 12);
    }

    const diagonal = passes[2].basis.travelAxis;
    const angleFromVertical = (Math.atan2(diagonal.x, diagonal.y) * 180) / Math.PI;
    expect(angleFromVertical).toBeCloseTo(20, 12);
    expect(diagonal.x).toBeGreaterThan(0);
    expect(diagonal.y).toBeGreaterThan(0);
  });

  it("starts and ends every panel beyond every projected arena corner", () => {
    for (const arena of ARENAS) {
      const corners = arenaCorners(arena);
      for (const pass of geometry(arena, "v3-intro").passes) {
        const arenaProjections = corners.map((point) => dot(point, pass.basis.travelAxis));
        const startVertices = getWingPassFrame(pass, 0).panels.flatMap(
          (panel) => panel.vertices,
        );
        const endVertices = getWingPassFrame(pass, 1).panels.flatMap(
          (panel) => panel.vertices,
        );

        expect(
          Math.max(...startVertices.map((point) => dot(point, pass.basis.travelAxis))),
        ).toBeLessThan(Math.min(...arenaProjections));
        expect(
          Math.min(...endVertices.map((point) => dot(point, pass.basis.travelAxis))),
        ).toBeGreaterThan(Math.max(...arenaProjections));
      }
    }
  });

  it("covers every arena corner when that point is crossed", () => {
    for (const arena of ARENAS) {
      const result = geometry(arena, "v3-intro");
      for (const pass of result.passes) {
        for (const corner of arenaCorners(arena)) {
          const frame = getWingPassFrame(pass, progressAtPoint(pass, corner));
          expect(circleIntersectsWingPanels(frame, corner, result.playerRadius)).toBe(true);
        }
      }
    }
  });

  it("keeps the opening center and internal tangency safe, then hits one epsilon outside", () => {
    for (const pass of geometry(ARENAS[3], "v3-intro").passes) {
      const result = geometry(ARENAS[3], "v3-intro");
      const frame = getWingPassFrame(pass, progressAtPoint(pass, pass.arenaCenter));
      expect(circleIntersectsWingPanels(frame, frame.gapCenter, result.playerRadius)).toBe(false);

      for (const side of [-1, 1]) {
        const tangent = add(
          frame.gapCenter,
          scale(frame.basis.spanAxis, side * (frame.gapHalfWidth - result.playerRadius)),
        );
        const outside = add(tangent, scale(frame.basis.spanAxis, side * 1e-5));
        expect(circleIntersectsWingPanels(frame, tangent, result.playerRadius)).toBe(false);
        expect(circleIntersectsWingPanels(frame, outside, result.playerRadius)).toBe(true);
      }
    }
  });

  it("forces movement away from each preceding canonical opening", () => {
    for (const profile of PROFILES) {
      const result = geometry(ARENAS[0], profile);
      for (let index = 1; index < result.passes.length; index += 1) {
        const previousSafeCenter = result.passes[index - 1].gapCenterAtArenaCenter;
        const nextPass = result.passes[index];
        const frame = getWingPassFrame(nextPass, progressAtPoint(nextPass, previousSafeCenter));
        expect(
          circleIntersectsWingPanels(frame, previousSafeCenter, result.playerRadius),
        ).toBe(true);
      }
    }
  });

  it("leaves no stationary safe point between consecutive V3 passages", () => {
    for (const arena of ARENAS) {
      const result = geometry(arena, "v3-intro");
      const playerMinX = arena.x + result.playerRadius;
      const playerMaxX = arena.x + arena.size - result.playerRadius;
      const playerMinY = arena.y + result.playerRadius;
      const playerMaxY = arena.y + arena.size - result.playerRadius;

      for (let index = 1; index < result.passes.length; index += 1) {
        const previous = result.passes[index - 1];
        const next = result.passes[index];
        expect(
          safeCorridorsIntersect(
            previous,
            next,
            result.playerRadius,
            playerMinX,
            playerMaxX,
            playerMinY,
            playerMaxY,
          ),
        ).toBe(false);
      }
    }
  });

  it("translates the same canonical panel vertices used for collision", () => {
    const result = geometry(ARENAS[1], "v2");
    const pass = result.passes[1];
    const frame = getWingPassFrame(pass, 0.37);
    const delta = {
      x: frame.center.x - pass.travelStart.x,
      y: frame.center.y - pass.travelStart.y,
    };

    for (let panelIndex = 0; panelIndex < 2; panelIndex += 1) {
      frame.panels[panelIndex].vertices.forEach((vertex, vertexIndex) => {
        const canonical = pass.panels[panelIndex].vertices[vertexIndex];
        expect(vertex.x).toBeCloseTo(canonical.x + delta.x, 12);
        expect(vertex.y).toBeCloseTo(canonical.y + delta.y, 12);
      });
    }

    const panelCenter = frame.panels[0].vertices.reduce(
      (sum, point) => add(sum, scale(point, 1 / 4)),
      { x: 0, y: 0 },
    );
    expect(circleIntersectsWingPanels(frame, panelCenter, result.playerRadius)).toBe(true);
  });

  it("generates deterministic profile-specific ribs and dissolve strokes", () => {
    const expectedRibs = { v1: 6, v2: 8, "v3-intro": 10, "v3-mature": 10 } as const;
    for (const profile of PROFILES) {
      const first = geometry(ARENAS[2], profile);
      const second = geometry(ARENAS[2], profile);
      expect(second).toEqual(first);
      for (const pass of first.passes) {
        expect(pass.ribs).toHaveLength(expectedRibs[profile]);
        expect(pass.dissolveSegments).toHaveLength(8 + expectedRibs[profile]);
      }
    }
  });

  it("reproduces A exactly after an A to B to A resize round-trip", () => {
    const firstA = geometry(ARENAS[0], "v3-mature");
    const resizedB = geometry(ARENAS[4], "v3-mature");
    const secondA = geometry(ARENAS[0], "v3-mature");

    expect(resizedB.arenaSignature).not.toBe(firstA.arenaSignature);
    expect(secondA).toEqual(firstA);
  });

  it("keeps V3 intro and mature pass geometry identical", () => {
    const intro = geometry(ARENAS[3], "v3-intro");
    const mature = geometry(ARENAS[3], "v3-mature");
    expect(mature.passes).toEqual(intro.passes);
  });

  it("clamps traversal and fails safely for invalid inputs", () => {
    const result = geometry(ARENAS[0], "v1");
    const pass = result.passes[0];
    expect(getWingPassFrame(pass, -1)).toEqual(getWingPassFrame(pass, 0));
    expect(getWingPassFrame(pass, 2)).toEqual(getWingPassFrame(pass, 1));
    expect(circleIntersectsWingPanels(getWingPassFrame(pass, 0.5), { x: NaN, y: 0 }, 5)).toBe(
      false,
    );
    expect(circleIntersectsWingPanels(getWingPassFrame(pass, 0.5), { x: 0, y: 0 }, 0)).toBe(
      false,
    );

    expect(buildWingGeometry({ x: 0, y: 0, size: 0 }, "v1")).toBeNull();
    expect(buildWingGeometry({ x: NaN, y: 0, size: 280 }, "v1")).toBeNull();
    expect(buildWingGeometry(ARENAS[0], "unknown" as WingProfile)).toBeNull();
    expect(getWingArenaSignature({ x: 0, y: 0, size: Infinity })).toBeNull();
    expect(getWingArenaSignature({ x: -0, y: 0, size: 280 })).toBe("0:0:280");
  });
});
