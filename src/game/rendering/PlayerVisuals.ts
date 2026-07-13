import Phaser from "phaser";

export interface PlayerVisualState {
  time: number;
  x: number;
  y: number;
  radius: number;
  directionX: number;
  directionY: number;
  movementStrength: number;
  invulnerable: boolean;
  hitAge: number;
}

const COLORS = {
  ink: 0x041018,
  deepCyan: 0x0b3541,
  cyan: 0x4fe6f1,
  cyanSoft: 0x9bf8ff,
  gold: 0xf0cf79,
  goldLight: 0xffedb0,
  core: 0xf8f1d1,
  damage: 0xff7772,
};

export function drawPlayerVisuals(
  graphics: Phaser.GameObjects.Graphics,
  state: PlayerVisualState,
): void {
  const movement = Phaser.Math.Clamp(state.movementStrength, 0, 1);
  const directionLength = Math.hypot(state.directionX, state.directionY);
  const directionX = directionLength > 0.001 ? state.directionX / directionLength : 0;
  const directionY = directionLength > 0.001 ? state.directionY / directionLength : -1;
  const angle = Math.atan2(directionY, directionX);
  const breath = 0.5 + Math.sin(state.time * 0.0062) * 0.5;
  const orbit = state.time * 0.0024;
  const hitProgress = state.hitAge >= 0 && state.hitAge < 340
    ? 1 - state.hitAge / 340
    : 0;
  const bodyAlpha = state.invulnerable ? 0.78 + Math.sin(state.time * 0.026) * 0.12 : 1;
  const radius = state.radius;

  graphics.clear();
  drawInvulnerabilityEchoes(graphics, state, directionX, directionY, bodyAlpha);
  drawMotes(graphics, state.x, state.y, radius, orbit, breath, bodyAlpha);

  graphics.save();
  graphics.translateCanvas(state.x, state.y);
  graphics.rotateCanvas(angle);

  if (movement > 0.04) {
    drawMovementFragments(graphics, radius, movement, breath, bodyAlpha, state.time);
  }

  const stretch = movement * 0.12;
  graphics.scaleCanvas(1 + stretch, 1 - stretch * 0.42);

  graphics.fillStyle(COLORS.ink, 0.86 * bodyAlpha);
  graphics.fillEllipse(0, 0, radius * 2.9, radius * 2.46);
  graphics.lineStyle(1.25, COLORS.cyan, (0.42 + breath * 0.18) * bodyAlpha);
  graphics.strokeEllipse(0, 0, radius * 2.72, radius * 2.28);

  graphics.lineStyle(1.6, COLORS.gold, (0.56 + movement * 0.24) * bodyAlpha);
  graphics.beginPath();
  graphics.arc(0, 0, radius * 1.13, -1.08, 1.08);
  graphics.strokePath();
  graphics.lineStyle(1.15, COLORS.cyanSoft, (0.38 + breath * 0.22) * bodyAlpha);
  graphics.beginPath();
  graphics.arc(0, 0, radius * 1.13, Math.PI - 0.88, Math.PI + 0.88);
  graphics.strokePath();

  graphics.fillStyle(COLORS.deepCyan, 0.96 * bodyAlpha);
  graphics.fillCircle(0, 0, radius * 0.92);
  graphics.fillStyle(COLORS.core, 0.96 * bodyAlpha);
  graphics.fillCircle(0, 0, radius * (0.63 + breath * 0.035));
  graphics.fillStyle(COLORS.goldLight, 0.34 * bodyAlpha);
  graphics.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.25);

  drawMemoryGlyph(graphics, radius, bodyAlpha, breath);

  if (hitProgress > 0) {
    drawFractures(graphics, radius, hitProgress);
  }

  graphics.restore();

  if (hitProgress > 0) {
    const eased = Phaser.Math.Easing.Cubic.Out(1 - hitProgress);
    graphics.lineStyle(2, COLORS.damage, hitProgress * 0.82);
    graphics.strokeCircle(state.x, state.y, radius * (1.45 + eased * 3.2));
    graphics.lineStyle(1, COLORS.goldLight, hitProgress * 0.48);
    graphics.strokeCircle(state.x, state.y, radius * (2.1 + eased * 4.4));
  }
}

function drawMovementFragments(
  graphics: Phaser.GameObjects.Graphics,
  radius: number,
  movement: number,
  breath: number,
  alpha: number,
  time: number,
): void {
  for (let index = 0; index < 5; index += 1) {
    const flow = (time * 0.0048 + index * 0.19) % 1;
    const distance = radius * (2.05 + index * 0.64 + flow * 0.42);
    const curve = Math.sin(time * 0.008 - index * 0.82) * radius * (0.12 + index * 0.055);
    const fade = 1 - index * 0.145 - flow * 0.16;
    const size = radius * (0.23 - index * 0.022) * (0.82 + movement * 0.22);
    const fragmentAlpha = (0.08 + movement * 0.36 + breath * 0.035) * Math.max(0.18, fade) * alpha;
    const x = -distance;
    const y = curve;

    graphics.fillStyle(index % 3 === 1 ? COLORS.gold : COLORS.cyanSoft, fragmentAlpha);
    if (index % 2 === 0) {
      graphics.fillTriangle(x - size, y, x, y - size * 0.72, x, y + size * 0.72);
      graphics.fillTriangle(x + size, y, x, y - size * 0.72, x, y + size * 0.72);
    } else {
      graphics.fillCircle(x, y, Math.max(0.7, size * 0.72));
    }
  }
}

function drawMemoryGlyph(
  graphics: Phaser.GameObjects.Graphics,
  radius: number,
  alpha: number,
  breath: number,
): void {
  const width = radius * 0.43;
  const height = radius * 0.62;
  graphics.lineStyle(1.05, COLORS.deepCyan, 0.9 * alpha);
  graphics.lineBetween(0, -height, width, 0);
  graphics.lineBetween(width, 0, 0, height);
  graphics.lineBetween(0, height, -width, 0);
  graphics.lineBetween(-width, 0, 0, -height);
  graphics.lineStyle(0.8, COLORS.gold, (0.62 + breath * 0.2) * alpha);
  graphics.lineBetween(-width * 0.72, 0, width * 0.72, 0);
  graphics.fillStyle(COLORS.goldLight, 0.92 * alpha);
  graphics.fillCircle(0, 0, Math.max(0.8, radius * 0.13));
}

function drawFractures(
  graphics: Phaser.GameObjects.Graphics,
  radius: number,
  progress: number,
): void {
  graphics.lineStyle(1.15, COLORS.damage, 0.92 * progress);
  graphics.lineBetween(-radius * 0.08, -radius * 0.56, radius * 0.12, -radius * 0.12);
  graphics.lineBetween(radius * 0.12, -radius * 0.12, -radius * 0.14, radius * 0.18);
  graphics.lineBetween(-radius * 0.14, radius * 0.18, radius * 0.08, radius * 0.58);
  graphics.lineBetween(radius * 0.12, -radius * 0.12, radius * 0.46, -radius * 0.34);
  graphics.lineBetween(-radius * 0.14, radius * 0.18, -radius * 0.48, radius * 0.36);
}

function drawInvulnerabilityEchoes(
  graphics: Phaser.GameObjects.Graphics,
  state: PlayerVisualState,
  directionX: number,
  directionY: number,
  alpha: number,
): void {
  if (!state.invulnerable) {
    return;
  }

  const sideX = -directionY;
  const sideY = directionX;
  const phase = 0.5 + Math.sin(state.time * 0.021) * 0.5;
  for (let index = 1; index <= 3; index += 1) {
    const distance = state.radius * (1.8 + index * 1.05);
    const side = Math.sin(state.time * 0.008 - index) * state.radius * 0.45;
    const x = state.x - directionX * distance + sideX * side;
    const y = state.y - directionY * distance + sideY * side;
    const echoAlpha = (0.16 + phase * 0.08) * (1 - index * 0.18) * alpha;
    graphics.lineStyle(1.1, index % 2 === 0 ? COLORS.gold : COLORS.cyan, echoAlpha);
    graphics.strokeCircle(x, y, state.radius * (1.05 - index * 0.08));
  }
}

function drawMotes(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  orbit: number,
  breath: number,
  alpha: number,
): void {
  for (let index = 0; index < 3; index += 1) {
    const angle = orbit * (index % 2 === 0 ? 1 : -0.72) + index * (Math.PI * 2 / 3);
    const distance = radius * (2.15 + index * 0.24 + breath * 0.16);
    graphics.fillStyle(index === 1 ? COLORS.gold : COLORS.cyanSoft, (0.32 + breath * 0.18) * alpha);
    graphics.fillCircle(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      0.9 + index * 0.18,
    );
  }
}
