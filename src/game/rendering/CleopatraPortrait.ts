import Phaser from "phaser";

export type CleopatraCastFamily = "summon" | "solar" | "temporal";

interface CleopatraPortraitOptions {
  alpha?: number;
  pulse?: number;
  halo?: boolean;
  time?: number;
  targetX?: number;
  targetY?: number;
  phase?: number;
  transition?: number;
  castFamily?: CleopatraCastFamily | null;
  castProgress?: number;
  ultimate?: boolean;
  finale?: number;
  collapse?: number;
}

const COLORS = {
  ink: 0x05070c,
  deepNavy: 0x07131b,
  lapis: 0x0b3159,
  lapisDark: 0x071f3a,
  cyan: 0x43d6cf,
  cyanSoft: 0x8df7ff,
  gold: 0xe2bf64,
  goldLight: 0xffe39a,
  bronze: 0xa56b37,
  skin: 0xd9955a,
  skinLight: 0xe5ad72,
  red: 0xa83f42,
  shadow: 0x171017,
};

export function drawCleopatraPortrait(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  options: CleopatraPortraitOptions = {},
): void {
  const s = scale;
  const alpha = options.alpha ?? 1;
  const pulse = options.pulse ?? 0.5;
  const time = options.time ?? 0;
  const targetX = Phaser.Math.Clamp(options.targetX ?? 0, -1, 1);
  const targetY = Phaser.Math.Clamp(options.targetY ?? 0, -1, 1);
  const phase = Phaser.Math.Clamp(options.phase ?? 0, 0, 2);
  const transition = Phaser.Math.Clamp(options.transition ?? 0, 0, 1);
  const finale = Phaser.Math.Clamp(options.finale ?? 0, 0, 1);
  const collapse = Phaser.Math.Clamp(options.collapse ?? 0, 0, 1);
  const ultimateCadence = options.ultimate ? 0.5 + Math.sin(time * 0.0031) * 0.5 : 0;
  const castProgress = Phaser.Math.Clamp(options.castProgress ?? 1, 0, 1);
  const castStrength = options.castFamily ? Math.sin(castProgress * Math.PI) : 0;
  const breathCycle = 0.5 + Math.sin(time * 0.0019) * 0.5;
  const breath = Phaser.Math.Linear(0.5, breathCycle, 1 - collapse);
  const blinkCycle = (time % 4300) / 4300;
  const blink = blinkCycle > 0.935
    ? Math.sin(((blinkCycle - 0.935) / 0.065) * Math.PI)
    : 0;
  const sway = (Math.sin(time * 0.00135) * 1.7 * (options.ultimate ? 0.58 : 1) + targetX * 1.2) * (1 - collapse);
  const lift = (breath - 0.5) * 1.8 - transition * 3.4 - castStrength * 1.3 - finale * 0.8 - ultimateCadence * 0.35 + collapse * 7;
  const tilt = targetX * 0.009 + Math.sin(time * 0.00082) * 0.004 * (1 - collapse) + castStrength * 0.004 + collapse * 0.045;
  const lw = (width: number) => Math.max(0.8, width * s);

  graphics.save();
  graphics.translateCanvas(x, y);
  graphics.rotateCanvas(tilt);
  graphics.scaleCanvas(
    1 + transition * 0.012 - collapse * 0.05,
    1 + (breath - 0.5) * 0.008 + finale * 0.006 - collapse * 0.12,
  );

  if (options.castFamily === "temporal" && castStrength > 0) {
    drawTemporalEchoes(graphics, 0, lift, s, alpha, castStrength, lw);
  }

  if (options.halo) {
    drawHalo(graphics, 0, lift, s, alpha, pulse + finale * 0.18, lw);
  }

  drawStateUnderlay(graphics, 0, lift, s, alpha, options.castFamily ?? null, castStrength, phase, transition, Math.max(finale, ultimateCadence * 0.28), time, lw);
  drawOuterSilhouette(graphics, 0, lift, s, alpha, lw);
  drawHeaddress(graphics, 0, lift, s, alpha, pulse, sway, lw);
  drawBodyAndCollar(graphics, 0, lift, s, alpha, options.castFamily === "summon" ? castStrength : 0, transition, lw);
  drawFace(graphics, 0, lift, s, alpha, lw);
  drawCrown(
    graphics,
    0,
    lift,
    s,
    alpha,
    pulse,
    options.castFamily ?? null,
    castStrength,
    transition,
    Math.max(finale, ultimateCadence * 0.24),
    collapse,
    lw,
  );
  drawFacialDetails(
    graphics,
    0,
    lift,
    s,
    alpha,
    blink,
    targetX,
    targetY,
    options.castFamily === "solar" ? castStrength : 0,
    Math.max(finale, ultimateCadence * 0.22),
    collapse,
    lw,
  );
  drawStateOverlay(graphics, 0, lift, s, alpha, options.castFamily ?? null, castStrength, transition, Math.max(finale, ultimateCadence * 0.34), time, lw);
  graphics.restore();
}

export function drawCleopatraKnowledgeSeal(
  graphics: Phaser.GameObjects.Graphics,
  state: {
    x: number;
    y: number;
    radius: number;
    alpha: number;
    progress: number;
    palette: { primary: number; secondary: number; core: number };
  },
): void {
  const radius = state.radius;
  const reveal = Phaser.Math.Easing.Cubic.Out(state.progress);

  graphics.save();
  graphics.translateCanvas(state.x, state.y);
  graphics.rotateCanvas((1 - reveal) * -0.08);
  graphics.scaleCanvas(0.82 + reveal * 0.18, 0.82 + reveal * 0.18);

  graphics.lineStyle(1.2, state.palette.primary, state.alpha * 0.88);
  graphics.strokeRoundedRect(-radius * 0.56, -radius * 0.78, radius * 1.12, radius * 1.56, radius * 0.52);
  graphics.lineStyle(0.85, state.palette.secondary, state.alpha * 0.72);
  graphics.strokeEllipse(0, -radius * 0.08, radius * 0.78, radius * 0.38);
  graphics.fillStyle(state.palette.core, state.alpha * 0.9);
  graphics.fillCircle(0, -radius * 0.08, Math.max(0.8, radius * 0.1));

  graphics.lineStyle(1.05, state.palette.primary, state.alpha * 0.84);
  graphics.lineBetween(-radius * 0.31, -radius * 0.48, 0, -radius * 0.64);
  graphics.lineBetween(0, -radius * 0.64, radius * 0.31, -radius * 0.48);
  graphics.lineBetween(-radius * 0.25, -radius * 0.45, radius * 0.25, -radius * 0.45);
  graphics.fillStyle(state.palette.primary, state.alpha * 0.86);
  graphics.fillTriangle(0, radius * 0.24, -radius * 0.18, radius * 0.51, radius * 0.18, radius * 0.51);
  graphics.fillStyle(state.palette.secondary, state.alpha * 0.82);
  graphics.fillCircle(0, radius * 0.38, Math.max(0.7, radius * 0.07));

  graphics.restore();
}

function drawHalo(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  pulse: number,
  lw: (width: number) => number,
): void {
  const haloY = y - 4 * s;
  graphics.fillStyle(COLORS.gold, alpha * (0.055 + pulse * 0.035));
  graphics.fillCircle(x, haloY, (103 + pulse * 4) * s);
  graphics.lineStyle(lw(1.6), COLORS.gold, alpha * (0.22 + pulse * 0.14));
  graphics.strokeCircle(x, haloY, (111 + pulse * 4) * s);
  graphics.lineStyle(lw(1), COLORS.cyanSoft, alpha * (0.18 + pulse * 0.1));
  graphics.strokeCircle(x, haloY, (129 + pulse * 3) * s);
  graphics.lineStyle(lw(1), COLORS.gold, alpha * 0.18);
  graphics.strokeCircle(x, haloY, 78 * s);
}

function drawOuterSilhouette(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.ink, 0.96 * alpha);
  graphics.fillEllipse(x, y + 4 * s, 112 * s, 126 * s);
  graphics.fillStyle(COLORS.deepNavy, 0.98 * alpha);
  graphics.fillTriangle(x - 84 * s, y + 106 * s, x, y + 31 * s, x + 84 * s, y + 106 * s);

  graphics.fillStyle(COLORS.lapisDark, 0.98 * alpha);
  graphics.fillTriangle(x - 65 * s, y - 30 * s, x - 98 * s, y + 92 * s, x - 21 * s, y + 69 * s);
  graphics.fillTriangle(x + 65 * s, y - 30 * s, x + 98 * s, y + 92 * s, x + 21 * s, y + 69 * s);

  graphics.lineStyle(lw(2.4), COLORS.gold, 0.78 * alpha);
  graphics.lineBetween(x - 62 * s, y - 16 * s, x - 88 * s, y + 82 * s);
  graphics.lineBetween(x + 62 * s, y - 16 * s, x + 88 * s, y + 82 * s);
  graphics.lineStyle(lw(1.4), COLORS.cyan, 0.46 * alpha);
  graphics.lineBetween(x - 49 * s, y - 21 * s, x - 65 * s, y + 67 * s);
  graphics.lineBetween(x + 49 * s, y - 21 * s, x + 65 * s, y + 67 * s);
}

function drawHeaddress(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  pulse: number,
  sway: number,
  lw: (width: number) => number,
): void {
  const leftSway = sway * s;
  const rightSway = -sway * 0.72 * s;
  graphics.fillStyle(COLORS.lapis, 0.96 * alpha);
  graphics.fillTriangle(x - 50 * s, y - 26 * s, x - 73 * s + leftSway, y + 74 * s, x - 26 * s, y + 61 * s);
  graphics.fillTriangle(x + 50 * s, y - 26 * s, x + 73 * s + rightSway, y + 74 * s, x + 26 * s, y + 61 * s);

  graphics.lineStyle(lw(2), COLORS.gold, 0.86 * alpha);
  for (let index = 0; index < 4; index += 1) {
    const offset = (26 + index * 11) * s;
    const weight = 0.42 + index * 0.18;
    graphics.lineBetween(x - offset, y - 16 * s, x - offset - 14 * s + leftSway * weight, y + 66 * s);
    graphics.lineBetween(x + offset, y - 16 * s, x + offset + 14 * s + rightSway * weight, y + 66 * s);
  }

  graphics.lineStyle(lw(1.4), COLORS.cyan, (0.45 + pulse * 0.12) * alpha);
  graphics.lineBetween(x - 38 * s, y - 19 * s, x - 47 * s + leftSway * 0.65, y + 63 * s);
  graphics.lineBetween(x + 38 * s, y - 19 * s, x + 47 * s + rightSway * 0.65, y + 63 * s);
}

function drawBodyAndCollar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  summon: number,
  transition: number,
  lw: (width: number) => number,
): void {
  const collarScale = 1 + summon * 0.1 + transition * 0.055;
  graphics.fillStyle(COLORS.skin, alpha);
  graphics.fillRoundedRect(x - 10 * s, y + 25 * s, 20 * s, 34 * s, 5 * s);
  graphics.fillStyle(COLORS.bronze, 0.96 * alpha);
  graphics.fillRoundedRect(x - 20 * s, y + 55 * s, 40 * s, 19 * s, 7 * s);

  graphics.fillStyle(COLORS.lapis, 0.98 * alpha);
  graphics.fillEllipse(x, y + 62 * s, 92 * s * collarScale, 29 * s * (1 + summon * 0.04));
  graphics.lineStyle(lw(3.2), COLORS.gold, 0.9 * alpha);
  graphics.strokeEllipse(x, y + 61 * s, 98 * s * collarScale, 36 * s * (1 + summon * 0.04));
  graphics.lineStyle(lw(1.7), COLORS.red, 0.74 * alpha);
  graphics.strokeEllipse(x, y + 62 * s, 66 * s, 21 * s);
  graphics.lineStyle(lw(1.2), COLORS.cyan, 0.5 * alpha);
  graphics.strokeEllipse(x, y + 62 * s, 78 * s, 26 * s);

  if (summon > 0) {
    graphics.lineStyle(lw(1.4), COLORS.goldLight, summon * 0.58 * alpha);
    graphics.strokeEllipse(x, y + 62 * s, 110 * s * collarScale, 43 * s);
  }
}

function drawFace(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.skin, alpha);
  graphics.fillEllipse(x, y - 9 * s, 49 * s, 64 * s);
  graphics.fillStyle(COLORS.skinLight, 0.33 * alpha);
  graphics.fillEllipse(x - 7 * s, y - 15 * s, 19 * s, 34 * s);
  graphics.fillStyle(COLORS.bronze, 0.14 * alpha);
  graphics.fillEllipse(x + 12 * s, y + 2 * s, 17 * s, 28 * s);

  graphics.fillStyle(COLORS.shadow, 0.98 * alpha);
  graphics.fillTriangle(x - 31 * s, y - 37 * s, x, y - 18 * s, x + 31 * s, y - 37 * s);
  graphics.fillRoundedRect(x - 33 * s, y - 25 * s, 66 * s, 20 * s, 5 * s);
  graphics.fillTriangle(x - 33 * s, y - 6 * s, x - 23 * s, y + 31 * s, x - 13 * s, y - 3 * s);
  graphics.fillTriangle(x + 33 * s, y - 6 * s, x + 23 * s, y + 31 * s, x + 13 * s, y - 3 * s);

  graphics.lineStyle(lw(1), COLORS.gold, 0.4 * alpha);
  graphics.lineBetween(x - 28 * s, y - 5 * s, x - 20 * s, y + 24 * s);
  graphics.lineBetween(x + 28 * s, y - 5 * s, x + 20 * s, y + 24 * s);
  graphics.lineStyle(lw(0.8), COLORS.skinLight, 0.36 * alpha);
  graphics.lineBetween(x - 5 * s, y - 20 * s, x - 8 * s, y + 2 * s);
}

function drawCrown(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  pulse: number,
  castFamily: CleopatraCastFamily | null,
  castStrength: number,
  transition: number,
  finale: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const crownLag = Math.sin(collapse * Math.PI) * 7 * s;
  const crownY = y - (transition * 4.5 + (castFamily === "solar" ? castStrength * 2.4 : 0)) * s - crownLag;
  const crownGlow = Phaser.Math.Clamp(pulse + castStrength * 0.55 + transition * 0.5 + finale * 0.35, 0, 1.8);
  graphics.fillStyle(COLORS.gold, 0.98 * alpha);
  graphics.fillRoundedRect(x - 40 * s, crownY - 43 * s, 80 * s, 13 * s, 5 * s);
  graphics.fillStyle(COLORS.goldLight, 0.55 * alpha);
  graphics.fillRoundedRect(x - 34 * s, crownY - 41 * s, 68 * s, 4 * s, 2 * s);
  graphics.lineStyle(lw(2), COLORS.cyan, 0.88 * alpha);
  graphics.lineBetween(x - 31 * s, crownY - 34 * s, x + 31 * s, crownY - 34 * s);

  graphics.fillStyle(COLORS.gold, 0.98 * alpha);
  graphics.fillCircle(x, crownY - 64 * s, 13 * s);
  graphics.fillStyle(COLORS.deepNavy, 0.7 * alpha);
  graphics.fillCircle(x, crownY - 64 * s, 8 * s);
  graphics.fillStyle(castFamily === "temporal" ? COLORS.cyanSoft : COLORS.goldLight, 0.92 * alpha);
  graphics.fillCircle(x, crownY - 64 * s, (5.2 + castStrength * 1.8) * s);
  graphics.lineStyle(lw(2 + transition * 0.8), castFamily === "temporal" ? COLORS.cyanSoft : COLORS.goldLight, (0.58 + crownGlow * 0.2) * alpha);
  graphics.strokeCircle(x, crownY - 64 * s, (17 + transition * 5 + finale * 2) * s);

  graphics.fillStyle(COLORS.cyan, 0.94 * alpha);
  graphics.fillTriangle(x, crownY - 58 * s, x - 7 * s, crownY - 38 * s, x + 7 * s, crownY - 38 * s);
  graphics.fillStyle(COLORS.red, 0.78 * alpha);
  graphics.fillCircle(x, crownY - 35 * s, 3.1 * s);

  const rayStrength = Math.max(castFamily === "solar" ? castStrength : 0, transition * 0.8, finale * 0.35);
  if (rayStrength > 0) {
    graphics.lineStyle(lw(1.35), COLORS.goldLight, rayStrength * 0.62 * alpha);
    for (let index = 0; index < 7; index += 1) {
      const angle = -Math.PI * 0.9 + index * (Math.PI * 0.3);
      const inner = (21 + transition * 3) * s;
      const outer = (29 + rayStrength * 11) * s;
      graphics.lineBetween(
        x + Math.cos(angle) * inner,
        crownY - 64 * s + Math.sin(angle) * inner,
        x + Math.cos(angle) * outer,
        crownY - 64 * s + Math.sin(angle) * outer,
      );
    }
  }
}

function drawFacialDetails(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  blink: number,
  targetX: number,
  targetY: number,
  solar: number,
  finale: number,
  collapse: number,
  lw: (width: number) => number,
): void {
  const eyeOpen = Math.max(0.06, (1 - blink) * (1 - collapse));
  const gazeX = targetX * 2.2 * s * (1 - collapse);
  const gazeY = targetY * 1.15 * s * (1 - collapse);
  const eyeGlow = Phaser.Math.Clamp(0.34 + solar * 0.62 + finale * 0.18, 0, 1);

  graphics.lineStyle(lw(2.1), COLORS.shadow, 0.9 * alpha);
  graphics.lineBetween(x - 20 * s, y - 12 * s, x - 7 * s, y - 9 * s);
  graphics.lineBetween(x + 7 * s, y - 9 * s, x + 20 * s, y - 12 * s);
  graphics.lineStyle(lw(1.3), COLORS.cyanSoft, 0.68 * alpha);
  graphics.lineBetween(x - 25 * s, y - 11 * s, x - 10 * s, y - 7 * s);
  graphics.lineBetween(x + 10 * s, y - 7 * s, x + 25 * s, y - 11 * s);

  graphics.fillStyle(COLORS.shadow, 0.92 * alpha);
  graphics.fillEllipse(x - 13 * s, y - 9 * s, 8 * s, Math.max(0.8, 4.2 * s * eyeOpen));
  graphics.fillEllipse(x + 13 * s, y - 9 * s, 8 * s, Math.max(0.8, 4.2 * s * eyeOpen));
  if (eyeOpen > 0.16) {
    graphics.fillStyle(solar > 0 ? COLORS.goldLight : COLORS.cyanSoft, (0.58 + eyeGlow * 0.34) * alpha * eyeOpen);
    graphics.fillCircle(x - 13 * s + gazeX, y - 9 * s + gazeY, (1.35 + solar * 0.55) * s);
    graphics.fillCircle(x + 13 * s + gazeX, y - 9 * s + gazeY, (1.35 + solar * 0.55) * s);
  }

  graphics.lineStyle(lw(1), COLORS.bronze, 0.5 * alpha);
  graphics.lineBetween(x, y - 5 * s, x - 3 * s, y + 5 * s);
  graphics.lineStyle(lw(0.75), COLORS.skinLight, 0.44 * alpha);
  graphics.lineBetween(x - 3 * s, y + 5 * s, x + 1 * s, y + 7 * s);
  graphics.fillStyle(COLORS.red, 0.84 * alpha);
  graphics.fillEllipse(x, y + 14 * s, 15 * s, 4.5 * s);
  graphics.fillStyle(COLORS.goldLight, 0.2 * alpha);
  graphics.fillEllipse(x - 2 * s, y + 13.4 * s, 6 * s, 1.1 * s);
  graphics.fillStyle(COLORS.goldLight, 0.5 * alpha);
  graphics.fillCircle(x - 29 * s, y + 8 * s, 3.5 * s);
  graphics.fillCircle(x + 29 * s, y + 8 * s, 3.5 * s);
}

function drawTemporalEchoes(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  strength: number,
  lw: (width: number) => number,
): void {
  const offset = (5 + strength * 8) * s;
  for (let index = 0; index < 2; index += 1) {
    const direction = index === 0 ? -1 : 1;
    const echoX = x + offset * direction;
    const color = direction < 0 ? COLORS.cyanSoft : COLORS.goldLight;
    graphics.lineStyle(lw(1.4), color, strength * 0.18 * alpha);
    graphics.strokeEllipse(echoX, y - 7 * s, 58 * s, 78 * s);
    graphics.lineBetween(echoX - 52 * s, y - 23 * s, echoX - 76 * s, y + 78 * s);
    graphics.lineBetween(echoX + 52 * s, y - 23 * s, echoX + 76 * s, y + 78 * s);
    graphics.lineStyle(lw(0.8), color, strength * 0.12 * alpha);
    graphics.strokeEllipse(echoX, y + 61 * s, 98 * s, 35 * s);
  }
}

function drawStateUnderlay(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  family: CleopatraCastFamily | null,
  cast: number,
  phase: number,
  transition: number,
  finale: number,
  time: number,
  lw: (width: number) => number,
): void {
  const phaseColor = phase === 0 ? COLORS.gold : phase === 1 ? COLORS.cyan : COLORS.red;

  if (family === "summon" && cast > 0) {
    graphics.fillStyle(COLORS.gold, cast * 0.055 * alpha);
    graphics.fillEllipse(x, y + 60 * s, (128 + cast * 20) * s, (48 + cast * 8) * s);
    graphics.lineStyle(lw(1.4), COLORS.cyanSoft, cast * 0.34 * alpha);
    graphics.strokeEllipse(x, y + 60 * s, (116 + cast * 16) * s, (42 + cast * 7) * s);
  }

  if (family === "solar" && cast > 0) {
    graphics.fillStyle(COLORS.goldLight, cast * 0.075 * alpha);
    graphics.fillCircle(x, y - 62 * s, (29 + cast * 8) * s);
  }

  if (family === "temporal" && cast > 0) {
    const offset = Math.sin(time * 0.008) * 3 * s;
    graphics.lineStyle(lw(1.2), COLORS.cyanSoft, cast * 0.32 * alpha);
    graphics.strokeCircle(x + offset, y - 5 * s, (92 + cast * 12) * s);
    graphics.lineStyle(lw(1), COLORS.gold, cast * 0.26 * alpha);
    graphics.strokeCircle(x - offset, y - 5 * s, (108 + cast * 9) * s);
  }

  const stateStrength = Math.max(transition, finale * 0.48);
  if (stateStrength > 0) {
    graphics.fillStyle(phaseColor, stateStrength * 0.05 * alpha);
    graphics.fillCircle(x, y - 4 * s, (104 + transition * 18 + finale * 8) * s);
    graphics.lineStyle(lw(1.4), phaseColor, stateStrength * 0.28 * alpha);
    graphics.strokeCircle(x, y - 4 * s, (118 + transition * 22 + finale * 10) * s);
  }
}

function drawStateOverlay(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  family: CleopatraCastFamily | null,
  cast: number,
  transition: number,
  finale: number,
  time: number,
  lw: (width: number) => number,
): void {
  if (family === "summon" && cast > 0) {
    graphics.lineStyle(lw(1.1), COLORS.goldLight, cast * 0.42 * alpha);
    for (let index = 0; index < 5; index += 1) {
      const offset = (index - 2) * 17 * s;
      const rise = (7 + (index % 2) * 6) * cast * s;
      graphics.lineBetween(x + offset, y + 58 * s, x + offset * 1.08, y + (39 - rise) * s);
    }
  }

  if (family === "solar" && cast > 0) {
    graphics.lineStyle(lw(1.25), COLORS.goldLight, cast * 0.66 * alpha);
    graphics.lineBetween(x - 25 * s, y - 9 * s, x - (34 + cast * 8) * s, y - 9 * s);
    graphics.lineBetween(x + 25 * s, y - 9 * s, x + (34 + cast * 8) * s, y - 9 * s);
  }

  if (family === "temporal" && cast > 0) {
    const rotation = time * 0.003;
    for (let index = 0; index < 4; index += 1) {
      const angle = rotation + index * Math.PI / 2;
      const radius = (78 + index * 5) * s;
      graphics.fillStyle(index % 2 === 0 ? COLORS.cyanSoft : COLORS.goldLight, cast * 0.42 * alpha);
      graphics.fillCircle(x + Math.cos(angle) * radius, y - 4 * s + Math.sin(angle) * radius * 0.62, (1.7 + cast) * s);
    }
  }

  const cadence = Math.max(transition, finale * (0.65 + Math.sin(time * 0.0046) * 0.18));
  if (cadence > 0) {
    graphics.lineStyle(lw(1.2), COLORS.goldLight, cadence * 0.38 * alpha);
    graphics.strokeEllipse(x, y - 4 * s, (138 + cadence * 14) * s, (94 + cadence * 8) * s);
    graphics.lineStyle(lw(0.9), COLORS.cyanSoft, cadence * 0.3 * alpha);
    graphics.strokeEllipse(x, y - 4 * s, (154 + cadence * 10) * s, (104 + cadence * 7) * s);
  }
}
