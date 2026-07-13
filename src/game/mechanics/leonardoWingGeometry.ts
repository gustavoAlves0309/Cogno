import {
  distanceFromPointToPolygon,
  playerRadiusForArena,
  type ArenaSquare,
  type Point2,
  type Segment2,
} from "./leonardoPerspectiveGeometry";
import {
  getWingPassDefinitions,
  type WingPassDefinition,
  type WingPassDirection,
  type WingProfile,
} from "./leonardoWingTimeline";

export type WingPanelId = "negative" | "positive";

export interface WingBasis {
  readonly travelAxis: Point2;
  readonly spanAxis: Point2;
}

export interface WingPanel {
  readonly id: WingPanelId;
  readonly vertices: readonly Point2[];
}

export interface WingGapGeometry {
  /** Normalized position across the arena span, excluding overscan. */
  readonly normalizedCenter: number;
  /** Offset from the moving wing center along basis.spanAxis. */
  readonly centerOffset: number;
  readonly halfWidth: number;
}

export interface WingPassGeometry {
  readonly index: number;
  readonly definition: WingPassDefinition;
  readonly direction: WingPassDirection;
  readonly basis: WingBasis;
  /** Fully outside the arena, before entering it. */
  readonly travelStart: Point2;
  /** Fully outside the arena, after leaving it. */
  readonly travelEnd: Point2;
  /** Center of the moving strip when it reaches the arena's projected midpoint. */
  readonly arenaCenter: Point2;
  /** Center on the arena boundary at which the wing enters. */
  readonly entryCenter: Point2;
  /** Center on the arena boundary at which the wing exits. */
  readonly exitCenter: Point2;
  readonly panelDepth: number;
  readonly overscan: number;
  readonly gap: WingGapGeometry;
  readonly gapCenterAtArenaCenter: Point2;
  readonly entryGapCenter: Point2;
  readonly exitGapCenter: Point2;
  /** Canonical render and collision polygons, positioned at travelStart. */
  readonly panels: readonly [WingPanel, WingPanel];
  /** Canonical decorative segments, positioned at travelStart. */
  readonly ribs: readonly Segment2[];
  /** Canonical dissolve strokes, positioned at travelStart. */
  readonly dissolveSegments: readonly Segment2[];
}

export interface WingPassFrame {
  readonly passIndex: number;
  readonly direction: WingPassDirection;
  readonly progress: number;
  readonly basis: WingBasis;
  readonly travelStart: Point2;
  readonly travelEnd: Point2;
  readonly center: Point2;
  readonly entryCenter: Point2;
  readonly exitCenter: Point2;
  readonly panelDepth: number;
  readonly gapCenter: Point2;
  readonly gapHalfWidth: number;
  readonly panels: readonly [WingPanel, WingPanel];
  readonly ribs: readonly Segment2[];
  readonly dissolveSegments: readonly Segment2[];
}

export interface WingGeometry {
  readonly profile: WingProfile;
  readonly arena: ArenaSquare;
  readonly arenaSignature: string;
  readonly signature: string;
  readonly playerRadius: number;
  readonly passes: readonly WingPassGeometry[];
}

const WING_PROFILES = ["v1", "v2", "v3-intro", "v3-mature"] as const;
const DIAGONAL_ANGLE_DEG = 20;
const PANEL_DEPTH_RATIO = 0.16;
const SPAN_OVERSCAN_RATIO = 0.04;
const COLLISION_EPSILON = 1e-9;

/**
 * Produces the cache key used to replace wing geometry atomically on resize.
 * Invalid arenas deliberately have no key and therefore cannot become active.
 */
export function getWingArenaSignature(arena: ArenaSquare): string | null {
  if (!isValidArena(arena)) {
    return null;
  }

  return `${stableNumber(arena.x)}:${stableNumber(arena.y)}:${stableNumber(arena.size)}`;
}

/** Builds all immutable, deterministic geometry needed by one profile. */
export function buildWingGeometry(
  arena: ArenaSquare,
  profile: WingProfile,
): WingGeometry | null {
  const arenaSignature = getWingArenaSignature(arena);
  if (arenaSignature === null || !isWingProfile(profile)) {
    return null;
  }

  const ownedArena: ArenaSquare = { x: arena.x, y: arena.y, size: arena.size };
  const playerRadius = playerRadiusForArena(ownedArena.size);
  const definitions = getWingPassDefinitions(profile);
  if (!Number.isFinite(playerRadius) || playerRadius <= 0 || !Array.isArray(definitions)) {
    return null;
  }

  const passes: WingPassGeometry[] = [];
  for (let index = 0; index < definitions.length; index += 1) {
    const pass = buildPassGeometry(ownedArena, definitions[index], index, profile, playerRadius);
    if (pass === null) {
      return null;
    }
    passes.push(pass);
  }

  return {
    profile,
    arena: ownedArena,
    arenaSignature,
    signature: `${arenaSignature}|${profile}`,
    playerRadius,
    passes,
  };
}

/**
 * Translates the canonical polygons and detail strokes to one traversal frame.
 * Progress is clamped, so late or negative frames never extrapolate hitboxes.
 */
export function getWingPassFrame(pass: WingPassGeometry, progress: number): WingPassFrame {
  const normalizedProgress = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  const center = lerpPoint(pass.travelStart, pass.travelEnd, normalizedProgress);
  const delta = subtract(center, pass.travelStart);

  return {
    passIndex: pass.index,
    direction: pass.direction,
    progress: normalizedProgress,
    basis: pass.basis,
    travelStart: pass.travelStart,
    travelEnd: pass.travelEnd,
    center,
    entryCenter: pass.entryCenter,
    exitCenter: pass.exitCenter,
    panelDepth: pass.panelDepth,
    gapCenter: add(center, scale(pass.basis.spanAxis, pass.gap.centerOffset)),
    gapHalfWidth: pass.gap.halfWidth,
    panels: [
      translatePanel(pass.panels[0], delta),
      translatePanel(pass.panels[1], delta),
    ],
    ribs: pass.ribs.map((segment) => translateSegment(segment, delta)),
    dissolveSegments: pass.dissolveSegments.map((segment) =>
      translateSegment(segment, delta),
    ),
  };
}

/**
 * Tests a player circle against the exact panel vertices supplied to rendering.
 * Internal tangency with either opening edge is safe by design.
 */
export function circleIntersectsWingPanels(
  frame: WingPassFrame,
  center: Point2,
  radius: number,
): boolean {
  if (!isFinitePoint(center) || !Number.isFinite(radius) || radius <= 0) {
    return false;
  }

  try {
    const distances = frame.panels.map((panel) =>
      distanceFromPointToPolygon(center, panel.vertices),
    );
    return distances.some(
      (distance) => distance === 0 || distance + COLLISION_EPSILON < radius,
    );
  } catch {
    // Malformed geometry fails closed for gameplay: no accidental damage.
    return false;
  }
}

function buildPassGeometry(
  arena: ArenaSquare,
  definition: WingPassDefinition,
  index: number,
  profile: WingProfile,
  playerRadius: number,
): WingPassGeometry | null {
  if (!isValidDefinition(definition)) {
    return null;
  }

  const basis = getWingBasis(definition.direction, definition.diagonalAngleDeg);
  if (basis === null) {
    return null;
  }

  const corners = getArenaCorners(arena);
  const travelBounds = projectionBounds(corners, basis.travelAxis);
  const spanBounds = projectionBounds(corners, basis.spanAxis);
  const arenaTravelCenter = midpoint(travelBounds[0], travelBounds[1]);
  const arenaSpanCenter = midpoint(spanBounds[0], spanBounds[1]);
  const panelDepth = arena.size * PANEL_DEPTH_RATIO;
  const halfDepth = panelDepth / 2;
  const overscan = Math.max(arena.size * SPAN_OVERSCAN_RATIO, playerRadius * 2);
  const startProjection = travelBounds[0] - halfDepth - overscan;
  const endProjection = travelBounds[1] + halfDepth + overscan;

  const travelStart = fromBasis(basis, startProjection, arenaSpanCenter);
  const travelEnd = fromBasis(basis, endProjection, arenaSpanCenter);
  const arenaCenter = fromBasis(basis, arenaTravelCenter, arenaSpanCenter);
  const entryCenter = fromBasis(basis, travelBounds[0], arenaSpanCenter);
  const exitCenter = fromBasis(basis, travelBounds[1], arenaSpanCenter);

  const playerDiameter = playerRadius * 2;
  const gapWidth = playerDiameter * definition.gapWidthInPlayerDiameters;
  const gapCenterProjection =
    spanBounds[0] + (spanBounds[1] - spanBounds[0]) * definition.gapCenter;
  const gapCenterOffset = gapCenterProjection - arenaSpanCenter;
  const gapHalfWidth = gapWidth / 2;
  const negativeOuterOffset = spanBounds[0] - arenaSpanCenter - overscan;
  const positiveOuterOffset = spanBounds[1] - arenaSpanCenter + overscan;
  const negativeInnerOffset = gapCenterOffset - gapHalfWidth;
  const positiveInnerOffset = gapCenterOffset + gapHalfWidth;

  if (
    negativeInnerOffset <= negativeOuterOffset ||
    positiveInnerOffset >= positiveOuterOffset
  ) {
    return null;
  }

  const panels: readonly [WingPanel, WingPanel] = [
    buildPanel(
      "negative",
      travelStart,
      basis,
      halfDepth,
      negativeOuterOffset,
      negativeInnerOffset,
    ),
    buildPanel(
      "positive",
      travelStart,
      basis,
      halfDepth,
      positiveInnerOffset,
      positiveOuterOffset,
    ),
  ];
  const ribs = buildRibs(
    travelStart,
    basis,
    halfDepth,
    [
      [negativeOuterOffset, negativeInnerOffset],
      [positiveInnerOffset, positiveOuterOffset],
    ],
    ribsPerPanel(profile),
  );
  const dissolveSegments = buildDissolveSegments(panels, ribs);
  const gap = {
    normalizedCenter: definition.gapCenter,
    centerOffset: gapCenterOffset,
    halfWidth: gapHalfWidth,
  };

  return {
    index,
    definition,
    direction: definition.direction,
    basis,
    travelStart,
    travelEnd,
    arenaCenter,
    entryCenter,
    exitCenter,
    panelDepth,
    overscan,
    gap,
    gapCenterAtArenaCenter: add(arenaCenter, scale(basis.spanAxis, gapCenterOffset)),
    entryGapCenter: add(entryCenter, scale(basis.spanAxis, gapCenterOffset)),
    exitGapCenter: add(exitCenter, scale(basis.spanAxis, gapCenterOffset)),
    panels,
    ribs,
    dissolveSegments,
  };
}

function getWingBasis(direction: WingPassDirection, angleDeg: number): WingBasis | null {
  if (direction === "down") {
    return { travelAxis: { x: 0, y: 1 }, spanAxis: { x: 1, y: 0 } };
  }
  if (direction === "up") {
    return { travelAxis: { x: 0, y: -1 }, spanAxis: { x: 1, y: 0 } };
  }
  if (direction !== "diagonal" || Math.abs(angleDeg - DIAGONAL_ANGLE_DEG) > 1e-9) {
    return null;
  }

  const angle = (angleDeg * Math.PI) / 180;
  return {
    travelAxis: { x: Math.sin(angle), y: Math.cos(angle) },
    spanAxis: { x: Math.cos(angle), y: -Math.sin(angle) },
  };
}

function buildPanel(
  id: WingPanelId,
  center: Point2,
  basis: WingBasis,
  halfDepth: number,
  spanStart: number,
  spanEnd: number,
): WingPanel {
  return {
    id,
    vertices: [
      localToWorld(center, basis, -halfDepth, spanStart),
      localToWorld(center, basis, halfDepth, spanStart),
      localToWorld(center, basis, halfDepth, spanEnd),
      localToWorld(center, basis, -halfDepth, spanEnd),
    ],
  };
}

function buildRibs(
  center: Point2,
  basis: WingBasis,
  halfDepth: number,
  ranges: readonly (readonly [number, number])[],
  countPerPanel: number,
): readonly Segment2[] {
  const ribs: Segment2[] = [];
  for (const [spanStart, spanEnd] of ranges) {
    const span = spanEnd - spanStart;
    for (let index = 1; index <= countPerPanel; index += 1) {
      const spanOffset = spanStart + (span * index) / (countPerPanel + 1);
      ribs.push([
        localToWorld(center, basis, -halfDepth * 0.72, spanOffset),
        localToWorld(center, basis, halfDepth * 0.72, spanOffset),
      ]);
    }
  }
  return ribs;
}

function buildDissolveSegments(
  panels: readonly [WingPanel, WingPanel],
  ribs: readonly Segment2[],
): readonly Segment2[] {
  const segments: Segment2[] = [];
  for (const panel of panels) {
    for (let index = 0; index < panel.vertices.length; index += 1) {
      const start = panel.vertices[index];
      const end = panel.vertices[(index + 1) % panel.vertices.length];
      const trim = index % 2 === 0 ? 0.08 : 0.13;
      segments.push([lerpPoint(start, end, trim), lerpPoint(start, end, 1 - trim)]);
    }
  }
  for (const [start, end] of ribs) {
    segments.push([lerpPoint(start, end, 0.16), lerpPoint(start, end, 0.86)]);
  }
  return segments;
}

function ribsPerPanel(profile: WingProfile): number {
  if (profile === "v1") {
    return 3;
  }
  if (profile === "v2") {
    return 4;
  }
  return 5;
}

function isValidDefinition(definition: WingPassDefinition): boolean {
  return (
    definition !== null &&
    typeof definition === "object" &&
    (definition.direction === "down" ||
      definition.direction === "up" ||
      definition.direction === "diagonal") &&
    Number.isFinite(definition.gapCenter) &&
    definition.gapCenter > 0 &&
    definition.gapCenter < 1 &&
    Number.isFinite(definition.gapWidthInPlayerDiameters) &&
    definition.gapWidthInPlayerDiameters > 2 &&
    Number.isFinite(definition.diagonalAngleDeg)
  );
}

function isWingProfile(profile: WingProfile): boolean {
  return (WING_PROFILES as readonly string[]).includes(profile);
}

function isValidArena(arena: ArenaSquare): boolean {
  return (
    arena !== null &&
    typeof arena === "object" &&
    Number.isFinite(arena.x) &&
    Number.isFinite(arena.y) &&
    Number.isFinite(arena.size) &&
    arena.size > 0
  );
}

function getArenaCorners(arena: ArenaSquare): readonly Point2[] {
  return [
    { x: arena.x, y: arena.y },
    { x: arena.x + arena.size, y: arena.y },
    { x: arena.x + arena.size, y: arena.y + arena.size },
    { x: arena.x, y: arena.y + arena.size },
  ];
}

function projectionBounds(points: readonly Point2[], axis: Point2): readonly [number, number] {
  const projections = points.map((point) => dot(point, axis));
  return [Math.min(...projections), Math.max(...projections)];
}

function fromBasis(basis: WingBasis, travel: number, span: number): Point2 {
  return add(scale(basis.travelAxis, travel), scale(basis.spanAxis, span));
}

function localToWorld(
  center: Point2,
  basis: WingBasis,
  travel: number,
  span: number,
): Point2 {
  return add(center, add(scale(basis.travelAxis, travel), scale(basis.spanAxis, span)));
}

function translatePanel(panel: WingPanel, delta: Point2): WingPanel {
  return {
    id: panel.id,
    vertices: panel.vertices.map((vertex) => add(vertex, delta)),
  };
}

function translateSegment(segment: Segment2, delta: Point2): Segment2 {
  return [add(segment[0], delta), add(segment[1], delta)];
}

function isFinitePoint(point: Point2): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function dot(first: Point2, second: Point2): number {
  return first.x * second.x + first.y * second.y;
}

function add(first: Point2, second: Point2): Point2 {
  return { x: first.x + second.x, y: first.y + second.y };
}

function subtract(first: Point2, second: Point2): Point2 {
  return { x: first.x - second.x, y: first.y - second.y };
}

function scale(point: Point2, factor: number): Point2 {
  return { x: point.x * factor, y: point.y * factor };
}

function lerpPoint(start: Point2, end: Point2, progress: number): Point2 {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function midpoint(first: number, second: number): number {
  return (first + second) / 2;
}

function stableNumber(value: number): string {
  return Object.is(value, -0) ? "0" : String(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
