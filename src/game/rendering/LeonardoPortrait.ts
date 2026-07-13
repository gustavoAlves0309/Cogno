import Phaser from "phaser";
import type {
  MemoryAbsorptionBossState,
  MemoryAbsorptionPalette,
  MemorySealVisualState,
} from "./MemoryAbsorptionVisuals";

export type LeonardoCastFamily = "geometry" | "machine" | "anatomy" | "revision";

export type LeonardoWingPageState =
  | "absent"
  | "emerging"
  | "v1"
  | "v2"
  | "v3"
  | "selected-mature";

export interface LeonardoWingPageInput {
  state: LeonardoWingPageState;
  /** Normalized progress within the current page state. Defaults to complete. */
  progress?: number;
}

export interface LeonardoPortraitOptions {
  alpha?: number;
  pulse?: number;
  time?: number;
  targetX?: number;
  targetY?: number;
  phase?: number;
  transition?: number;
  castFamily?: LeonardoCastFamily | null;
  castProgress?: number;
  ultimate?: boolean;
  finale?: number;
  collapse?: MemoryAbsorptionBossState["collapse"];
  wingPage?: LeonardoWingPageInput | null;
}

export const LEONARDO_MEMORY_PALETTE: MemoryAbsorptionPalette = {
  primary: 0x8d302e,
  secondary: 0x648f91,
  core: 0xf0d79a,
};

// The palette is shared by the full portrait and the menu icon. Saturated
// burgundy is reserved for Leonardo himself; arena decoration stays sepia.
const COLORS = {
  outline: 0x201914,
  outlineSoft: 0x46372b,
  robeShadow: 0x282224,
  robe: 0x49383a,
  robeLight: 0x70504b,
  collar: 0xd4bd8b,
  collarShadow: 0x8e744f,
  beretShadow: 0x4d2023,
  beret: 0x7e292c,
  beretLight: 0xa5453e,
  skinShadow: 0x9b5f42,
  skin: 0xc8865d,
  skinLight: 0xe0aa79,
  hairShadow: 0x69665f,
  hair: 0xaaa79c,
  hairLight: 0xd8d2bf,
  parchmentShadow: 0x9d7848,
  parchment: 0xdac28a,
  parchmentLight: 0xf1dda5,
  ink: 0x33271e,
  inkWash: 0x604738,
  brass: 0xa7834d,
  diagram: 0x63898a,
  diagramLight: 0x94b1aa,
  correction: 0xa13d36,
  wingPage: 0x9a84c6,
  wingPageShadow: 0x514568,
};

interface HeadState {
  alpha: number;
  gazeX: number;
  gazeY: number;
  focus: number;
  blink: number;
  collapse: number;
  detail: "portrait" | "icon";
}

export function drawLeonardoPortrait(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  options: LeonardoPortraitOptions = {},
): void {
  const alpha = Phaser.Math.Clamp(options.alpha ?? 1, 0, 1);
  const time = options.time ?? 0;
  const pulse = options.pulse ?? (0.5 + Math.sin(time * 0.0018) * 0.5);
  const targetX = Phaser.Math.Clamp(options.targetX ?? 0, -1, 1);
  const targetY = Phaser.Math.Clamp(options.targetY ?? 0, -1, 1);
  const phase = Phaser.Math.Clamp(options.phase ?? 0, 0, 3);
  const transition = Phaser.Math.Clamp(options.transition ?? 0, 0, 1);
  const finale = Phaser.Math.Clamp(options.finale ?? 0, 0, 1);
  const collapse = Phaser.Math.Clamp(options.collapse ?? 0, 0, 1);
  const castProgress = Phaser.Math.Clamp(options.castProgress ?? 1, 0, 1);
  const castFamily = options.castFamily ?? null;
  const wingPageState = options.wingPage?.state ?? "absent";
  const wingPageProgress = Phaser.Math.Clamp(options.wingPage?.progress ?? 1, 0, 1);
  const castStrength = castFamily ? Math.sin(castProgress * Math.PI) : 0;
  const obsession = Phaser.Math.Clamp(
    phase / 3 + (options.ultimate ? 0.08 : 0) + finale * 0.1,
    0,
    1,
  );
  const breath = Math.sin(time * 0.00155) * 0.85 * (1 - collapse);
  const blinkCycle = (time % 5100) / 5100;
  const blink = blinkCycle > 0.952
    ? Math.sin(((blinkCycle - 0.952) / 0.048) * Math.PI)
    : 0;
  const postureX = (obsession * 4.2 + castStrength * 2.4) * scale;
  const postureY = (breath + obsession * 1.7 - transition * 1.8 + collapse * 6) * scale;
  const tilt = targetX * 0.006 + obsession * 0.018 - castStrength * 0.009 + collapse * 0.035;
  const lw = (width: number) => Math.max(0.72, width * scale);

  graphics.save();
  graphics.translateCanvas(x + postureX, y + postureY);
  graphics.rotateCanvas(tilt);
  graphics.scaleCanvas(
    1 + transition * 0.01 - collapse * 0.055,
    1 + breath * 0.0018 - collapse * 0.09,
  );

  drawStudyLayers(graphics, scale, alpha, time, phase, pulse, castFamily, castStrength, finale, collapse, lw);
  if (wingPageState !== "selected-mature") {
    drawWingStudyPage(graphics, scale, alpha, wingPageState, wingPageProgress, collapse);
  }
  drawRenaissanceBody(graphics, scale, alpha, obsession, collapse, lw);
  drawCanonicalHead(graphics, scale, -39 * scale, {
    alpha,
    gazeX: targetX,
    gazeY: targetY,
    focus: Phaser.Math.Clamp(obsession * 0.78 + castStrength * 0.34, 0, 1),
    blink,
    collapse,
    detail: "portrait",
  }, lw);
  drawArmsCodexAndQuill(graphics, scale, alpha, obsession, castFamily, castStrength, collapse, lw);
  if (wingPageState === "selected-mature") {
    drawWingStudyPage(graphics, scale, alpha, wingPageState, wingPageProgress, collapse);
  }
  drawInkAccumulation(graphics, scale, alpha, phase, finale, collapse, lw);
  drawRevisionMarks(graphics, scale, alpha, time, phase, transition, finale, collapse, lw);

  graphics.restore();
}

/**
 * Draws the canonical Leonardo head for menu nodes. `scale` is the icon's
 * nominal radius, matching the scale already used by the menu icon renderer.
 */
export function drawLeonardoMenuIcon(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  alpha = 1,
): void {
  const unit = scale / 61;
  const safeAlpha = Phaser.Math.Clamp(alpha, 0, 1);
  const lw = (width: number) => Math.max(0.72, width * unit);

  graphics.save();
  graphics.translateCanvas(x, y - 8 * unit);

  // A single clean shoulder mass supports the beard without introducing a
  // second, icon-only costume design.
  graphics.fillStyle(COLORS.outline, safeAlpha * 0.92);
  fillPolygon(graphics, [
    [-55 * unit, 58 * unit],
    [-34 * unit, 34 * unit],
    [-19 * unit, 28 * unit],
    [0, 37 * unit],
    [19 * unit, 28 * unit],
    [34 * unit, 34 * unit],
    [55 * unit, 58 * unit],
  ]);
  graphics.fillStyle(COLORS.robe, safeAlpha);
  fillPolygon(graphics, [
    [-49 * unit, 58 * unit],
    [-31 * unit, 37 * unit],
    [-17 * unit, 32 * unit],
    [0, 42 * unit],
    [17 * unit, 32 * unit],
    [31 * unit, 37 * unit],
    [49 * unit, 58 * unit],
  ]);

  drawCanonicalHead(graphics, unit, 0, {
    alpha: safeAlpha,
    gazeX: 0,
    gazeY: 0,
    focus: 0.22,
    blink: 0,
    collapse: 0,
    detail: "icon",
  }, lw);

  // One restrained geometric accent survives at small size and links the icon
  // to the Codex language without becoming background noise.
  graphics.lineStyle(lw(1.35), COLORS.diagramLight, safeAlpha * 0.7);
  graphics.lineBetween(35 * unit, 30 * unit, 48 * unit, 30 * unit);
  graphics.lineBetween(48 * unit, 30 * unit, 48 * unit, 43 * unit);
  graphics.fillStyle(COLORS.brass, safeAlpha * 0.86);
  graphics.fillCircle(48 * unit, 30 * unit, Math.max(1, 1.8 * unit));
  graphics.restore();
}

export function drawLeonardoKnowledgeSeal(
  graphics: Phaser.GameObjects.Graphics,
  state: MemorySealVisualState,
): void {
  const reveal = Phaser.Math.Easing.Cubic.Out(Phaser.Math.Clamp(state.progress, 0, 1));
  const radius = state.radius;
  const alpha = state.alpha;

  graphics.save();
  graphics.translateCanvas(state.x, state.y);
  graphics.rotateCanvas((1 - reveal) * -0.18);
  graphics.scaleCanvas(0.72 + reveal * 0.28, 0.72 + reveal * 0.28);

  graphics.lineStyle(1.15, state.palette.primary, alpha * 0.82);
  graphics.strokeCircle(0, 0, radius * 0.82);
  graphics.lineStyle(0.8, state.palette.secondary, alpha * 0.62);
  graphics.strokeCircle(0, 0, radius * 0.66);

  graphics.lineStyle(0.9, state.palette.secondary, alpha * 0.68);
  for (const [px, py] of [
    [-0.72, -0.58],
    [0.72, -0.58],
    [-0.72, 0.58],
    [0.72, 0.58],
  ] as const) {
    graphics.lineBetween(px * radius, py * radius, 0, 0);
  }

  graphics.lineStyle(1.2, state.palette.primary, alpha * 0.92);
  graphics.beginPath();
  graphics.moveTo(-radius * 0.5, 0);
  graphics.lineTo(0, -radius * 0.24);
  graphics.lineTo(radius * 0.5, 0);
  graphics.lineTo(0, radius * 0.24);
  graphics.closePath();
  graphics.strokePath();
  graphics.fillStyle(state.palette.core, alpha * 0.9);
  graphics.fillCircle(0, 0, Math.max(0.9, radius * 0.11));
  graphics.lineStyle(0.8, state.palette.secondary, alpha * 0.88);
  graphics.strokeCircle(0, 0, radius * 0.18);

  graphics.lineStyle(1.15, state.palette.primary, alpha * (0.46 + reveal * 0.34));
  graphics.beginPath();
  const turns = 22;
  for (let index = 0; index <= turns; index += 1) {
    const t = index / turns;
    const angle = t * Math.PI * 3.8 + 0.2;
    const spiralRadius = radius * (0.16 + t * 0.62);
    const sx = Math.cos(angle) * spiralRadius;
    const sy = Math.sin(angle) * spiralRadius;
    if (index === 0) {
      graphics.moveTo(sx, sy);
    } else {
      graphics.lineTo(sx, sy);
    }
  }
  graphics.strokePath();

  graphics.lineStyle(1.1, state.palette.primary, alpha * 0.76);
  drawCorner(graphics, -radius * 0.82, -radius * 0.82, 1, 1, radius * 0.23);
  drawCorner(graphics, radius * 0.82, radius * 0.82, -1, -1, radius * 0.23);
  graphics.restore();
}

function drawStudyLayers(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  time: number,
  phase: number,
  pulse: number,
  castFamily: LeonardoCastFamily | null,
  castStrength: number,
  finale: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const progress = Phaser.Math.Clamp(phase / 3 + finale * 0.18, 0, 1);
  const fade = 1 - collapse * 0.72;
  const baseAlpha = alpha * fade * (0.1 + progress * 0.16 + castStrength * 0.24);
  const centerY = -35 * s;

  // The phase-one construction is deliberately sparse: enough to establish
  // Leonardo as an observer, never enough to compete with attack telegraphs.
  graphics.lineStyle(lw(0.8), COLORS.brass, baseAlpha * (0.68 + pulse * 0.16));
  graphics.strokeCircle(-54 * s, centerY + 12 * s, (25 + progress * 6) * s);
  graphics.lineBetween(-79 * s, centerY + 12 * s, -29 * s, centerY + 12 * s);
  graphics.lineBetween(-54 * s, centerY - 13 * s, -54 * s, centerY + 37 * s);

  if (phase >= 1 || castStrength > 0.08) {
    graphics.lineStyle(lw(0.75), COLORS.diagram, baseAlpha * 0.92);
    graphics.strokeRect(31 * s, -77 * s, 49 * s, 49 * s);
    graphics.lineBetween(31 * s, -77 * s, 80 * s, -28 * s);
    graphics.lineBetween(80 * s, -77 * s, 31 * s, -28 * s);
  }

  if (phase >= 2 || finale > 0.08) {
    graphics.lineStyle(lw(0.72), COLORS.brass, baseAlpha * 0.82);
    const drift = Math.sin(time * 0.0014) * 1.8 * s;
    graphics.strokeEllipse(3 * s, -42 * s + drift, 174 * s, 105 * s);
    graphics.lineBetween(-86 * s, -42 * s + drift, 92 * s, -42 * s + drift);
  }

  if (castFamily === null) {
    return;
  }

  const castAlpha = alpha * castStrength * fade * 0.72;
  graphics.lineStyle(lw(1.15), COLORS.diagramLight, castAlpha);
  if (castFamily === "geometry" || castFamily === "revision") {
    for (let index = 0; index < 5; index += 1) {
      const offset = (index - 2) * 13 * s;
      graphics.lineBetween(-76 * s, 2 * s + offset * 0.22, 0, -39 * s);
      graphics.lineBetween(76 * s, 2 * s + offset * 0.22, 0, -39 * s);
    }
  } else if (castFamily === "machine") {
    const radius = 23 * s;
    graphics.strokeCircle(60 * s, -7 * s, radius);
    graphics.strokeCircle(60 * s, -7 * s, radius * 0.42);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      graphics.lineBetween(
        60 * s + Math.cos(angle) * radius * 0.72,
        -7 * s + Math.sin(angle) * radius * 0.72,
        60 * s + Math.cos(angle) * radius * 1.18,
        -7 * s + Math.sin(angle) * radius * 1.18,
      );
    }
  } else {
    graphics.strokeEllipse(58 * s, -9 * s, 31 * s, 42 * s);
    graphics.lineBetween(58 * s, -30 * s, 58 * s, 12 * s);
    graphics.lineBetween(43 * s, -9 * s, 73 * s, -9 * s);
  }
}

function drawWingStudyPage(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  state: LeonardoWingPageState,
  progress: number,
  collapse: number,
): void {
  if (state === "absent") {
    return;
  }

  const stateProgress = Phaser.Math.Clamp(progress, 0, 1);
  const arrival = state === "emerging"
    ? Phaser.Math.Easing.Cubic.Out(stateProgress)
    : 1;
  if (arrival <= 0) {
    return;
  }

  // Mature selection is an out-and-back gesture: the page keeps its V3
  // drawing and only changes staging, scale, and accent intensity.
  const selection = state === "selected-mature"
    ? Math.sin(stateProgress * Math.PI)
    : 0;
  const pulse = state === "selected-mature"
    ? Math.sin(stateProgress * Math.PI * 4) * selection
    : 0;
  const pageScale = (0.72 + arrival * 0.28) * (1 + selection * 0.12 + pulse * 0.018);
  const unit = s * pageScale;
  const pageAlpha = alpha * arrival * (1 - collapse * 0.72);
  const pageX = (-93 - (1 - arrival) * 9 + selection * 34) * s;
  const pageY = (-42 + (1 - arrival) * 17 - selection * 5) * s;

  const correction = state === "v2"
    ? stateProgress
    : state === "v3" || state === "selected-mature"
      ? 1
      : 0;
  const articulation = state === "v3"
    ? stateProgress
    : state === "selected-mature"
      ? 1
      : 0;
  const clean = state === "v2"
    ? 0.25 + correction * 0.5
    : state === "v3"
      ? 0.75 + articulation * 0.25
      : state === "selected-mature"
        ? 1
        : 0;

  const roughCorners = [
    [-31, -36],
    [27, -40],
    [32, 36],
    [-27, 40],
  ] as const;
  const cleanCorners = [
    [-31, -40],
    [31, -40],
    [31, 40],
    [-31, 40],
  ] as const;
  const corners = roughCorners.map(([roughX, roughY], index) => {
    const [cleanX, cleanY] = cleanCorners[index];
    return [
      Phaser.Math.Linear(roughX, cleanX, clean),
      Phaser.Math.Linear(roughY, cleanY, clean),
    ] as const;
  });

  graphics.save();
  graphics.translateCanvas(pageX, pageY);
  graphics.rotateCanvas(-0.055 - (1 - clean) * 0.025 - (1 - arrival) * 0.1 + selection * 0.075);

  graphics.fillStyle(COLORS.outlineSoft, pageAlpha * 0.34);
  fillLocalPolygon(graphics, unit, corners, 3.6, 3.2);
  graphics.fillStyle(COLORS.parchmentShadow, pageAlpha * 0.96);
  fillLocalPolygon(graphics, unit, corners, 1.4, 1.2);
  graphics.fillStyle(COLORS.parchment, pageAlpha);
  fillLocalPolygon(graphics, unit, corners);

  // Broad value bands keep the sheet readable when it is only ~25 px wide.
  graphics.fillStyle(COLORS.parchmentLight, pageAlpha * 0.32);
  fillLocalPolygon(graphics, unit, [
    [-27, -34],
    [23, -36],
    [14, -26],
    [-26, -23],
  ]);
  graphics.fillStyle(COLORS.parchmentShadow, pageAlpha * 0.18);
  fillLocalPolygon(graphics, unit, [
    [-28, 27],
    [30, 23],
    [30, 36],
    [-26, 38],
  ]);

  graphics.lineStyle(pageLineWidth(unit, 1.25), COLORS.ink, pageAlpha * 0.78);
  strokeLocalPath(graphics, unit, corners, true);

  const accentAlpha = pageAlpha * (0.76 + selection * 0.2 + Math.max(0, pulse) * 0.08);
  drawPageAccentPath(graphics, unit, [
    [-26, -30],
    [-27, 31],
    [-16, 35],
  ], accentAlpha, 1.4);
  drawPageAccentPath(graphics, unit, [
    [-26, -30],
    [-12, -34],
  ], accentAlpha * 0.9, 1.4);
  if (correction > 0) {
    drawPageAccentPath(graphics, unit, [
      [-16, 35],
      [Phaser.Math.Linear(-16, 14, correction), 35],
    ], accentAlpha * revealStep(correction, 0, 0.72), 1.25);
  }
  if (articulation > 0) {
    const frameReveal = revealStep(articulation, 0.28, 1);
    drawPageAccentPath(graphics, unit, [
      [-12, -34],
      [26, -34],
      [27, Phaser.Math.Linear(-34, 29, frameReveal)],
    ], accentAlpha * frameReveal, 1.25);
  }

  // The violet tab and border identify the Wing page. Violet is deliberately
  // confined to these page accents and the wing diagram itself.
  graphics.fillStyle(COLORS.wingPageShadow, pageAlpha * 0.94);
  fillLocalPolygon(graphics, unit, [
    [17, -42],
    [29, -39],
    [27, -23],
    [18, -25],
  ]);
  graphics.fillStyle(COLORS.wingPage, accentAlpha * 0.9);
  fillLocalPolygon(graphics, unit, [
    [20, -39],
    [27, -37],
    [25, -27],
    [20, -28],
  ]);

  if (state === "emerging" || state === "v1") {
    drawRoughWingStudy(graphics, unit, pageAlpha, state === "emerging" ? arrival : stateProgress, true);
  } else if (state === "v2") {
    drawRoughWingStudy(graphics, unit, pageAlpha * 0.48, 1, false);
    drawCorrectedWingStudy(graphics, unit, pageAlpha, correction, true);
    drawWingCorrectionMarks(graphics, unit, pageAlpha, correction);
  } else if (state === "v3") {
    drawCorrectedWingStudy(graphics, unit, pageAlpha * 0.46, 1, false);
    drawArticulatedWingStudy(graphics, unit, pageAlpha, articulation);
    drawDiagonalStudyMark(graphics, unit, pageAlpha, articulation);
  } else {
    drawArticulatedWingStudy(graphics, unit, accentAlpha, 1);
    drawDiagonalStudyMark(graphics, unit, pageAlpha, 1);
  }

  graphics.restore();
}

function drawRoughWingStudy(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  alpha: number,
  progress: number,
  accented: boolean,
): void {
  const leftReveal = revealStep(progress, 0.08, 0.72);
  const rightReveal = revealStep(progress, 0.34, 1);
  const stemReveal = revealStep(progress, 0, 0.28);

  drawWingStudyPath(graphics, unit, [
    [0, -10],
    [0, 14],
  ], alpha * stemReveal, accented, 1.65);
  drawWingStudyPath(graphics, unit, [
    [0, -9],
    [-8, -17],
    [-25, -9],
    [-18, 0],
    [-7, 6],
    [0, 14],
  ], alpha * leftReveal, accented, 1.65);
  drawWingStudyPath(graphics, unit, [
    [0, -9],
    [8, -13],
    [22, -6],
    [15, 3],
    [6, 7],
    [0, 14],
  ], alpha * rightReveal, accented, 1.65);

  graphics.lineStyle(pageLineWidth(unit, 0.86), COLORS.inkWash, alpha * 0.68);
  if (leftReveal > 0) {
    strokeLocalPath(graphics, unit, [[-8, -16], [-7, 5]], false);
    strokeLocalPath(graphics, unit, [[-19, -11], [-16, 0]], false);
  }
  if (rightReveal > 0.35) {
    strokeLocalPath(graphics, unit, [[8, -12], [6, 6]], false);
  }

  graphics.lineStyle(pageLineWidth(unit, 0.72), COLORS.inkWash, alpha * 0.44);
  strokeLocalPath(graphics, unit, [[-20, 24], [-5, 22]], false);
  strokeLocalPath(graphics, unit, [[-18, 29], [2, 27]], false);
}

function drawCorrectedWingStudy(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  alpha: number,
  progress: number,
  accented: boolean,
): void {
  const mainReveal = revealStep(progress, 0, 0.62);
  const reinforceReveal = revealStep(progress, 0.38, 0.88);
  const jointReveal = revealStep(progress, 0.68, 1);
  const left = [
    [0, -10],
    [-9, -17],
    [-25, -10],
    [-20, 0],
    [-8, 7],
    [0, 14],
  ] as const;
  const right = left.map(([x, y]) => [-x, y] as const);

  drawWingStudyPath(graphics, unit, [[0, -12], [0, 15]], alpha * mainReveal, accented, 1.7);
  drawWingStudyPath(graphics, unit, left, alpha * mainReveal, accented, 1.7);
  drawWingStudyPath(graphics, unit, right, alpha * mainReveal, accented, 1.7);

  graphics.lineStyle(pageLineWidth(unit, 1), accented ? COLORS.ink : COLORS.wingPageShadow, alpha * reinforceReveal * 0.76);
  strokeLocalPath(graphics, unit, [[-9, -16], [-8, 6]], false);
  strokeLocalPath(graphics, unit, [[9, -16], [8, 6]], false);
  strokeLocalPath(graphics, unit, [[-21, -9], [-18, 0]], false);
  strokeLocalPath(graphics, unit, [[21, -9], [18, 0]], false);
  drawWingStudyJoint(graphics, unit, -9, -16, alpha * jointReveal, accented);
  drawWingStudyJoint(graphics, unit, 9, -16, alpha * jointReveal, accented);
}

function drawArticulatedWingStudy(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  alpha: number,
  progress: number,
): void {
  const coreReveal = revealStep(progress, 0, 0.36);
  const panelReveal = revealStep(progress, 0.2, 0.78);
  const jointReveal = revealStep(progress, 0.5, 1);
  const left = [
    [0, -11],
    [-8, -18],
    [-17, -16],
    [-27, -8],
    [-23, 2],
    [-10, 9],
    [0, 15],
  ] as const;
  const right = left.map(([x, y]) => [-x, y] as const);

  drawPageAccentPath(graphics, unit, [[0, -14], [0, 15]], alpha * coreReveal, 1.75);
  drawPageAccentPath(graphics, unit, left, alpha * panelReveal, 1.75);
  drawPageAccentPath(graphics, unit, right, alpha * panelReveal, 1.75);

  graphics.lineStyle(pageLineWidth(unit, 1.05), COLORS.ink, alpha * panelReveal * 0.76);
  strokeLocalPath(graphics, unit, [[-8, -18], [-10, 9]], false);
  strokeLocalPath(graphics, unit, [[8, -18], [10, 9]], false);
  strokeLocalPath(graphics, unit, [[-17, -16], [-23, 2]], false);
  strokeLocalPath(graphics, unit, [[17, -16], [23, 2]], false);

  for (const [x, y] of [[-8, -18], [8, -18], [-17, -16], [17, -16]] as const) {
    drawWingStudyJoint(graphics, unit, x, y, alpha * jointReveal, true);
  }
  drawWingStudyJoint(graphics, unit, 0, -11, alpha * coreReveal, true);
}

function drawWingCorrectionMarks(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  alpha: number,
  progress: number,
): void {
  const first = revealStep(progress, 0.18, 0.5);
  const second = revealStep(progress, 0.54, 0.9);
  if (first > 0) {
    graphics.lineStyle(pageLineWidth(unit, 0.9), COLORS.inkWash, alpha * first * 0.72);
    strokeLocalPath(graphics, unit, [[-23, 19], [-14, 27]], false);
    strokeLocalPath(graphics, unit, [[-22, 28], [-14, 19]], false);
  }
  if (second > 0) {
    graphics.lineStyle(pageLineWidth(unit, 0.9), COLORS.inkWash, alpha * second * 0.72);
    strokeLocalPath(graphics, unit, [[23, 25], [13, 19]], false);
    strokeLocalPath(graphics, unit, [[13, 19], [17, 19]], false);
    strokeLocalPath(graphics, unit, [[13, 19], [15, 23]], false);
  }
}

function drawDiagonalStudyMark(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  alpha: number,
  progress: number,
): void {
  const reveal = revealStep(progress, 0.62, 1);
  if (reveal <= 0) {
    return;
  }
  graphics.lineStyle(pageLineWidth(unit, 1), COLORS.inkWash, alpha * reveal * 0.7);
  strokeLocalPath(graphics, unit, [[-18, 28], [18, 20]], false);
  strokeLocalPath(graphics, unit, [[18, 20], [13, 18]], false);
  strokeLocalPath(graphics, unit, [[18, 20], [15, 24]], false);
}

function drawWingStudyPath(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  points: ReadonlyArray<readonly [number, number]>,
  alpha: number,
  accented: boolean,
  width: number,
): void {
  if (accented) {
    drawPageAccentPath(graphics, unit, points, alpha, width);
    return;
  }
  graphics.lineStyle(pageLineWidth(unit, width), COLORS.wingPageShadow, alpha * 0.74);
  strokeLocalPath(graphics, unit, points, false);
}

function drawPageAccentPath(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  points: ReadonlyArray<readonly [number, number]>,
  alpha: number,
  width: number,
): void {
  if (alpha <= 0 || points.length < 2) {
    return;
  }
  graphics.lineStyle(pageLineWidth(unit, width + 1.25), COLORS.wingPageShadow, alpha * 0.68);
  strokeLocalPath(graphics, unit, points, false);
  graphics.lineStyle(pageLineWidth(unit, width), COLORS.wingPage, alpha);
  strokeLocalPath(graphics, unit, points, false);
}

function drawWingStudyJoint(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  x: number,
  y: number,
  alpha: number,
  accented: boolean,
): void {
  const outerColor = COLORS.wingPageShadow;
  const innerColor = accented ? COLORS.wingPage : COLORS.parchment;
  graphics.fillStyle(outerColor, alpha * 0.88);
  graphics.fillCircle(x * unit, y * unit, Math.max(0.8, 2.45 * unit));
  graphics.fillStyle(innerColor, alpha);
  graphics.fillCircle(x * unit, y * unit, Math.max(0.44, 1.12 * unit));
}

function pageLineWidth(unit: number, width: number): number {
  return Math.max(0.72, width * unit);
}

function revealStep(value: number, start: number, end: number): number {
  return Phaser.Math.Clamp((value - start) / (end - start), 0, 1);
}

function fillLocalPolygon(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  points: ReadonlyArray<readonly [number, number]>,
  offsetX = 0,
  offsetY = 0,
): void {
  if (points.length < 3) {
    return;
  }
  graphics.beginPath();
  graphics.moveTo((points[0][0] + offsetX) * unit, (points[0][1] + offsetY) * unit);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo((points[index][0] + offsetX) * unit, (points[index][1] + offsetY) * unit);
  }
  graphics.closePath();
  graphics.fillPath();
}

function strokeLocalPath(
  graphics: Phaser.GameObjects.Graphics,
  unit: number,
  points: ReadonlyArray<readonly [number, number]>,
  close: boolean,
): void {
  if (points.length < 2) {
    return;
  }
  graphics.beginPath();
  graphics.moveTo(points[0][0] * unit, points[0][1] * unit);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index][0] * unit, points[index][1] * unit);
  }
  if (close) {
    graphics.closePath();
  }
  graphics.strokePath();
}

function drawRenaissanceBody(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  obsession: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const fade = alpha * (1 - collapse * 0.12);
  const shoulderRise = obsession * 3 * s;

  graphics.fillStyle(COLORS.outline, fade * 0.94);
  fillPolygon(graphics, [
    [-76 * s, 82 * s],
    [-68 * s, 45 * s],
    [-51 * s, 14 * s - shoulderRise],
    [-24 * s, 1 * s],
    [0, 8 * s],
    [24 * s, 1 * s],
    [51 * s, 14 * s + shoulderRise * 0.3],
    [68 * s, 45 * s],
    [76 * s, 82 * s],
  ]);

  graphics.fillStyle(COLORS.robe, fade);
  fillPolygon(graphics, [
    [-69 * s, 80 * s],
    [-62 * s, 47 * s],
    [-47 * s, 19 * s - shoulderRise],
    [-23 * s, 7 * s],
    [0, 15 * s],
    [23 * s, 7 * s],
    [47 * s, 19 * s + shoulderRise * 0.3],
    [62 * s, 47 * s],
    [69 * s, 80 * s],
  ]);

  graphics.fillStyle(COLORS.robeLight, fade * 0.56);
  fillPolygon(graphics, [
    [-57 * s, 70 * s],
    [-51 * s, 34 * s],
    [-34 * s, 16 * s],
    [-21 * s, 12 * s],
    [-8 * s, 73 * s],
  ]);
  graphics.fillStyle(COLORS.robeShadow, fade * 0.68);
  fillPolygon(graphics, [
    [24 * s, 12 * s],
    [48 * s, 23 * s],
    [61 * s, 58 * s],
    [52 * s, 80 * s],
    [9 * s, 73 * s],
  ]);

  // The broad, folded collar anchors the head and keeps the costume legible at
  // the boss's smallest gameplay scale.
  graphics.fillStyle(COLORS.collarShadow, fade * 0.96);
  fillPolygon(graphics, [
    [-31 * s, 8 * s],
    [-9 * s, 3 * s],
    [0, 16 * s],
    [9 * s, 3 * s],
    [31 * s, 8 * s],
    [20 * s, 28 * s],
    [0, 21 * s],
    [-20 * s, 28 * s],
  ]);
  graphics.fillStyle(COLORS.collar, fade);
  fillPolygon(graphics, [
    [-27 * s, 9 * s],
    [-8 * s, 6 * s],
    [0, 17 * s],
    [8 * s, 6 * s],
    [27 * s, 9 * s],
    [18 * s, 22 * s],
    [0, 18 * s],
    [-18 * s, 22 * s],
  ]);
  graphics.lineStyle(lw(1.1), COLORS.outlineSoft, fade * 0.7);
  graphics.lineBetween(0, 21 * s, 0, 78 * s);
  graphics.lineBetween(-49 * s, 28 * s, -55 * s, 70 * s);
  graphics.lineBetween(46 * s, 28 * s, 54 * s, 70 * s);
}

function drawCanonicalHead(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  y: number,
  state: HeadState,
  lw: (width: number) => number,
): void {
  const alpha = state.alpha;
  const hairAlpha = alpha * (1 - state.collapse * 0.1);
  graphics.save();
  graphics.translateCanvas(0, y);

  // Back hair is one continuous silver silhouette with small curls breaking the
  // edge. This reads as long human hair instead of the old symmetric gray blobs.
  graphics.fillStyle(COLORS.outline, hairAlpha * 0.88);
  graphics.fillEllipse(0, -4 * s, 60 * s, 63 * s);
  graphics.fillStyle(COLORS.hairShadow, hairAlpha);
  graphics.fillEllipse(0, -5 * s, 56 * s, 59 * s);
  const curls = [
    [-28, -7, 9], [-30, 3, 10], [-28, 14, 10], [-25, 25, 9],
    [28, -7, 9], [30, 3, 10], [28, 14, 10], [25, 25, 9],
  ] as const;
  for (const [cx, cy, radius] of curls) {
    graphics.fillStyle(COLORS.hair, hairAlpha);
    graphics.fillCircle(cx * s, cy * s, radius * 0.58 * s);
    graphics.fillStyle(COLORS.hairLight, hairAlpha * 0.38);
    graphics.fillCircle((cx - Math.sign(cx) * 1.8) * s, (cy - 1.4) * s, radius * 0.25 * s);
  }

  graphics.fillStyle(COLORS.skinShadow, alpha);
  graphics.fillEllipse(-19 * s, 0, 8 * s, 15 * s);
  graphics.fillEllipse(19 * s, 0, 8 * s, 15 * s);
  graphics.fillStyle(COLORS.skin, alpha);
  graphics.fillEllipse(0, -5 * s, 37 * s, 53 * s);

  // Warm cel-painted light on the brow and cheek; the shadow preserves the
  // long, recognizable face in grayscale.
  graphics.fillStyle(COLORS.skinLight, alpha * 0.7);
  graphics.fillEllipse(-5 * s, -11 * s, 21 * s, 31 * s);
  graphics.fillStyle(COLORS.skinShadow, alpha * 0.38);
  fillPolygon(graphics, [
    [4 * s, -28 * s],
    [18 * s, -17 * s],
    [17 * s, 8 * s],
    [8 * s, 18 * s],
    [3 * s, 6 * s],
  ]);

  drawBeret(graphics, s, alpha, lw);
  drawBeard(graphics, s, hairAlpha, lw);
  drawFacialFeatures(graphics, s, state, lw);

  if (state.collapse > 0) {
    graphics.lineStyle(lw(0.9), COLORS.correction, alpha * state.collapse * 0.76);
    graphics.lineBetween(-16 * s, -17 * s, 11 * s, 9 * s);
    graphics.lineBetween(-12 * s, 7 * s, 9 * s, -13 * s);
  }
  graphics.restore();
}

function drawBeret(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.outline, alpha * 0.94);
  graphics.fillEllipse(0, -32 * s, 58 * s, 16 * s);
  graphics.fillStyle(COLORS.beretShadow, alpha);
  graphics.fillEllipse(0, -33 * s, 54 * s, 14 * s);
  graphics.fillStyle(COLORS.beret, alpha);
  fillPolygon(graphics, [
    [-23 * s, -34 * s],
    [-14 * s, -44 * s],
    [5 * s, -47 * s],
    [23 * s, -39 * s],
    [27 * s, -32 * s],
    [-26 * s, -31 * s],
  ]);
  graphics.fillStyle(COLORS.beretLight, alpha * 0.64);
  graphics.fillEllipse(-4 * s, -39 * s, 25 * s, 7 * s);
  graphics.lineStyle(lw(0.8), COLORS.outlineSoft, alpha * 0.66);
  graphics.lineBetween(-25 * s, -31 * s, 25 * s, -31 * s);
}

function drawBeard(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.outline, alpha * 0.72);
  fillPolygon(graphics, [
    [-20 * s, 10 * s],
    [-23 * s, 24 * s],
    [-18 * s, 38 * s],
    [-10 * s, 50 * s],
    [0, 61 * s],
    [11 * s, 48 * s],
    [19 * s, 36 * s],
    [23 * s, 20 * s],
    [17 * s, 9 * s],
  ]);
  graphics.fillStyle(COLORS.hairShadow, alpha);
  fillPolygon(graphics, [
    [-18 * s, 10 * s],
    [-20 * s, 24 * s],
    [-15 * s, 37 * s],
    [-8 * s, 49 * s],
    [0, 58 * s],
    [9 * s, 47 * s],
    [16 * s, 34 * s],
    [20 * s, 19 * s],
    [15 * s, 10 * s],
  ]);
  graphics.fillStyle(COLORS.hair, alpha * 0.88);
  fillPolygon(graphics, [
    [-10 * s, 13 * s],
    [-12 * s, 27 * s],
    [-7 * s, 41 * s],
    [0, 54 * s],
    [8 * s, 39 * s],
    [12 * s, 25 * s],
    [9 * s, 13 * s],
  ]);

  graphics.lineStyle(lw(0.82), COLORS.hairLight, alpha * 0.65);
  for (let index = -2; index <= 2; index += 1) {
    const startX = index * 5.2 * s;
    graphics.beginPath();
    graphics.moveTo(startX, 15 * s);
    graphics.lineTo((index * 4 + (index % 2 === 0 ? 2 : -2)) * s, 29 * s);
    graphics.lineTo(index * 2.2 * s, (44 + Math.abs(index) * 2) * s);
    graphics.strokePath();
  }
  graphics.fillStyle(COLORS.hairLight, alpha * 0.46);
  graphics.fillCircle(-14 * s, 20 * s, 4.2 * s);
  graphics.fillCircle(14 * s, 20 * s, 4.2 * s);
}

function drawFacialFeatures(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  state: HeadState,
  lw: (width: number) => number,
): void {
  const alpha = state.alpha;
  const browDrop = state.focus * 1.7 * s;
  const eyeHeight = Math.max(0.45 * s, (2.15 - state.blink * 1.8) * s);
  const gazeX = state.gazeX * (1.15 - state.focus * 0.18) * s;
  const gazeY = state.gazeY * 0.62 * s;

  graphics.lineStyle(lw(1.15), COLORS.outline, alpha * 0.92);
  graphics.lineBetween(-15 * s, (-11 + state.focus * 1.2) * s, -5 * s, -12 * s - browDrop);
  graphics.lineBetween(5 * s, -12 * s - browDrop, 15 * s, (-11 + state.focus * 1.2) * s);
  graphics.fillStyle(COLORS.parchmentLight, alpha * 0.85);
  graphics.fillEllipse(-9 * s, -7 * s, 9.5 * s, eyeHeight * 2);
  graphics.fillEllipse(9 * s, -7 * s, 9.5 * s, eyeHeight * 2);
  if (state.blink < 0.86) {
    graphics.fillStyle(COLORS.outline, alpha * 0.96);
    graphics.fillCircle(-9 * s + gazeX, -7 * s + gazeY, Math.max(0.72, 1.35 * s));
    graphics.fillCircle(9 * s + gazeX, -7 * s + gazeY, Math.max(0.72, 1.35 * s));
    if (state.detail === "portrait") {
      graphics.fillStyle(COLORS.parchmentLight, alpha * 0.86);
      graphics.fillCircle(-9.4 * s + gazeX, -7.4 * s + gazeY, Math.max(0.35, 0.42 * s));
      graphics.fillCircle(8.6 * s + gazeX, -7.4 * s + gazeY, Math.max(0.35, 0.42 * s));
    }
  }

  // Long nose, restrained mouth and age lines establish the historical anchor.
  graphics.lineStyle(lw(0.9), COLORS.outlineSoft, alpha * 0.76);
  graphics.lineBetween(1 * s, -5 * s, -2 * s, 6 * s);
  graphics.lineBetween(-2 * s, 6 * s, 3.5 * s, 8 * s);
  graphics.lineBetween(-7 * s, 13 * s, 7 * s, (13 - state.focus * 0.7) * s);
  graphics.lineStyle(lw(0.7), COLORS.skinShadow, alpha * 0.65);
  graphics.lineBetween(-17 * s, -1 * s, -12 * s, 3 * s);
  graphics.lineBetween(17 * s, -1 * s, 12 * s, 3 * s);
  if (state.detail === "portrait") {
    graphics.lineBetween(-13 * s, -19 * s, -7 * s, -22 * s);
    graphics.lineBetween(13 * s, -19 * s, 7 * s, -22 * s);
    graphics.lineBetween(-10 * s, 8 * s, -14 * s, 12 * s);
    graphics.lineBetween(10 * s, 8 * s, 14 * s, 12 * s);
  }
}

function drawArmsCodexAndQuill(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  obsession: number,
  castFamily: LeonardoCastFamily | null,
  castStrength: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const bookFade = alpha * (1 - collapse * 0.5);
  const bookY = (42 - obsession * 3 - castStrength * 4) * s;
  const rightHandLift = castStrength * 17 * s;

  // Sleeves visibly connect the torso to the hands, avoiding the old puppet
  // anatomy even when the quill hand rises during a cast.
  graphics.fillStyle(COLORS.robeLight, alpha * 0.88);
  fillPolygon(graphics, [
    [-52 * s, 30 * s],
    [-38 * s, 28 * s],
    [-27 * s, bookY - 2 * s],
    [-39 * s, bookY + 8 * s],
  ]);
  fillPolygon(graphics, [
    [52 * s, 30 * s],
    [39 * s, 25 * s],
    [28 * s, bookY - rightHandLift],
    [40 * s, bookY + 8 * s - rightHandLift * 0.35],
  ]);

  graphics.fillStyle(COLORS.parchmentShadow, bookFade);
  fillPolygon(graphics, [
    [-38 * s, bookY + 2 * s],
    [-2 * s, bookY - 3 * s],
    [0, bookY + 32 * s],
    [-37 * s, bookY + 26 * s],
  ]);
  fillPolygon(graphics, [
    [38 * s, bookY + 2 * s],
    [2 * s, bookY - 3 * s],
    [0, bookY + 32 * s],
    [37 * s, bookY + 26 * s],
  ]);
  graphics.fillStyle(COLORS.parchment, bookFade);
  fillPolygon(graphics, [
    [-35 * s, bookY],
    [-2 * s, bookY - 4 * s],
    [-2 * s, bookY + 28 * s],
    [-34 * s, bookY + 23 * s],
  ]);
  fillPolygon(graphics, [
    [35 * s, bookY],
    [2 * s, bookY - 4 * s],
    [2 * s, bookY + 28 * s],
    [34 * s, bookY + 23 * s],
  ]);
  graphics.lineStyle(lw(1), COLORS.ink, bookFade * 0.76);
  graphics.lineBetween(0, bookY - 4 * s, 0, bookY + 31 * s);
  graphics.lineBetween(-35 * s, bookY, -2 * s, bookY - 4 * s);
  graphics.lineBetween(35 * s, bookY, 2 * s, bookY - 4 * s);

  graphics.lineStyle(lw(0.62), COLORS.inkWash, bookFade * 0.6);
  graphics.lineBetween(-29 * s, bookY + 7 * s, -9 * s, bookY + 4 * s);
  graphics.lineBetween(-29 * s, bookY + 12 * s, -12 * s, bookY + 10 * s);
  graphics.lineBetween(9 * s, bookY + 5 * s, 29 * s, bookY + 8 * s);
  graphics.lineBetween(10 * s, bookY + 11 * s, 25 * s, bookY + 13 * s);
  graphics.lineStyle(lw(0.72), COLORS.diagram, bookFade * 0.66);
  graphics.strokeCircle(21 * s, bookY + 20 * s, 5.8 * s);
  graphics.lineBetween(15 * s, bookY + 20 * s, 27 * s, bookY + 20 * s);

  graphics.fillStyle(COLORS.skinShadow, alpha * 0.96);
  graphics.fillEllipse(-33 * s, bookY + 1 * s, 15 * s, 9 * s);
  graphics.fillEllipse(32 * s, bookY - rightHandLift, 15 * s, 9 * s);
  graphics.fillStyle(COLORS.skinLight, alpha * 0.42);
  graphics.fillEllipse(-35 * s, bookY - 0.5 * s, 7 * s, 3.5 * s);
  graphics.fillEllipse(30 * s, bookY - rightHandLift - 1.5 * s, 7 * s, 3.5 * s);
  graphics.lineStyle(lw(0.65), COLORS.outlineSoft, alpha * 0.76);
  graphics.lineBetween(-37 * s, bookY, -29 * s, bookY + 2 * s);
  graphics.lineBetween(28 * s, bookY - rightHandLift, 36 * s, bookY - rightHandLift + 1.5 * s);

  if (castFamily !== null) {
    graphics.lineStyle(lw(1.35), COLORS.outline, alpha * (0.75 + castStrength * 0.2));
    graphics.lineBetween(35 * s, bookY - rightHandLift, 50 * s, bookY - 35 * s - rightHandLift);
    graphics.fillStyle(COLORS.parchmentLight, alpha * 0.9);
    fillPolygon(graphics, [
      [50 * s, bookY - 35 * s - rightHandLift],
      [46 * s, bookY - 20 * s - rightHandLift],
      [54 * s, bookY - 25 * s - rightHandLift],
    ]);
  }
}

function drawInkAccumulation(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  phase: number,
  finale: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const level = Phaser.Math.Clamp(phase + finale, 0, 4);
  const fade = alpha * (1 - collapse * 0.35);
  const stains = [
    [-47, 45, 4.4], [43, 57, 3.6], [-22, 66, 2.8],
    [31, 27, 2.6], [-57, 62, 2.2], [12, 72, 3.1],
  ] as const;
  for (let index = 0; index < Math.min(stains.length, Math.ceil(level * 1.55)); index += 1) {
    const [x, y, radius] = stains[index];
    graphics.fillStyle(index % 3 === 0 ? COLORS.correction : COLORS.ink, fade * (0.32 + level * 0.07));
    graphics.fillCircle(x * s, y * s, radius * s);
    graphics.fillCircle((x + radius * 1.35) * s, (y + radius * 0.35) * s, radius * 0.34 * s);
  }

  if (phase >= 2 || finale > 0.2) {
    graphics.lineStyle(lw(0.75), COLORS.ink, fade * 0.42);
    graphics.lineBetween(-63 * s, 52 * s, -51 * s, 58 * s);
    graphics.lineBetween(45 * s, 68 * s, 56 * s, 74 * s);
  }
}

function drawRevisionMarks(
  graphics: Phaser.GameObjects.Graphics,
  s: number,
  alpha: number,
  time: number,
  phase: number,
  transition: number,
  finale: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const phaseLayer = Math.max(0, phase - 0.65) / 2.35;
  const strength = Phaser.Math.Clamp(phaseLayer * 0.56 + transition * 0.7 + finale * 0.72 + collapse * 0.48, 0, 1);
  if (strength <= 0.02) {
    return;
  }

  const jitter = Math.sin(time * 0.017) * 1.2 * s;
  graphics.lineStyle(lw(1.25), COLORS.correction, alpha * strength * 0.68);
  graphics.lineBetween(-78 * s, -73 * s + jitter, -58 * s, -61 * s - jitter);
  graphics.lineBetween(-75 * s, -57 * s - jitter, -59 * s, -77 * s + jitter);
  if (phase >= 2 || finale > 0.15 || transition > 0.45) {
    graphics.lineBetween(50 * s, -73 * s, 76 * s, -73 * s + jitter);
    graphics.lineBetween(63 * s, -85 * s, 63 * s + jitter, -59 * s);
    graphics.lineStyle(lw(0.78), COLORS.correction, alpha * strength * 0.52);
    graphics.strokeCircle(63 * s, -72 * s, 18 * s);
  }
}

function fillPolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: ReadonlyArray<readonly [number, number]>,
): void {
  if (points.length < 3) {
    return;
  }
  graphics.beginPath();
  graphics.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index][0], points[index][1]);
  }
  graphics.closePath();
  graphics.fillPath();
}

function drawCorner(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
): void {
  graphics.lineBetween(x, y, x + dx * length, y);
  graphics.lineBetween(x, y, x, y + dy * length);
}
