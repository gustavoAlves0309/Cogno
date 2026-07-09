import Phaser from "phaser";

interface CleopatraPortraitOptions {
  alpha?: number;
  pulse?: number;
  halo?: boolean;
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
  const lw = (width: number) => Math.max(0.8, width * s);

  if (options.halo) {
    drawHalo(graphics, x, y, s, alpha, pulse, lw);
  }

  drawOuterSilhouette(graphics, x, y, s, alpha, lw);
  drawHeaddress(graphics, x, y, s, alpha, pulse, lw);
  drawBodyAndCollar(graphics, x, y, s, alpha, lw);
  drawFace(graphics, x, y, s, alpha, lw);
  drawCrown(graphics, x, y, s, alpha, pulse, lw);
  drawFacialDetails(graphics, x, y, s, alpha, lw);
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
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.lapis, 0.96 * alpha);
  graphics.fillTriangle(x - 50 * s, y - 26 * s, x - 73 * s, y + 74 * s, x - 26 * s, y + 61 * s);
  graphics.fillTriangle(x + 50 * s, y - 26 * s, x + 73 * s, y + 74 * s, x + 26 * s, y + 61 * s);

  graphics.lineStyle(lw(2), COLORS.gold, 0.86 * alpha);
  for (let index = 0; index < 4; index += 1) {
    const offset = (26 + index * 11) * s;
    graphics.lineBetween(x - offset, y - 16 * s, x - offset - 14 * s, y + 66 * s);
    graphics.lineBetween(x + offset, y - 16 * s, x + offset + 14 * s, y + 66 * s);
  }

  graphics.lineStyle(lw(1.4), COLORS.cyan, (0.45 + pulse * 0.12) * alpha);
  graphics.lineBetween(x - 38 * s, y - 19 * s, x - 47 * s, y + 63 * s);
  graphics.lineBetween(x + 38 * s, y - 19 * s, x + 47 * s, y + 63 * s);
}

function drawBodyAndCollar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.skin, alpha);
  graphics.fillRoundedRect(x - 10 * s, y + 25 * s, 20 * s, 34 * s, 5 * s);
  graphics.fillStyle(COLORS.bronze, 0.96 * alpha);
  graphics.fillRoundedRect(x - 20 * s, y + 55 * s, 40 * s, 19 * s, 7 * s);

  graphics.fillStyle(COLORS.lapis, 0.98 * alpha);
  graphics.fillEllipse(x, y + 62 * s, 92 * s, 29 * s);
  graphics.lineStyle(lw(3.2), COLORS.gold, 0.9 * alpha);
  graphics.strokeEllipse(x, y + 61 * s, 98 * s, 36 * s);
  graphics.lineStyle(lw(1.7), COLORS.red, 0.74 * alpha);
  graphics.strokeEllipse(x, y + 62 * s, 66 * s, 21 * s);
  graphics.lineStyle(lw(1.2), COLORS.cyan, 0.5 * alpha);
  graphics.strokeEllipse(x, y + 62 * s, 78 * s, 26 * s);
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

  graphics.fillStyle(COLORS.shadow, 0.98 * alpha);
  graphics.fillTriangle(x - 31 * s, y - 37 * s, x, y - 18 * s, x + 31 * s, y - 37 * s);
  graphics.fillRoundedRect(x - 33 * s, y - 25 * s, 66 * s, 20 * s, 5 * s);
  graphics.fillTriangle(x - 33 * s, y - 6 * s, x - 23 * s, y + 31 * s, x - 13 * s, y - 3 * s);
  graphics.fillTriangle(x + 33 * s, y - 6 * s, x + 23 * s, y + 31 * s, x + 13 * s, y - 3 * s);

  graphics.lineStyle(lw(1), COLORS.gold, 0.4 * alpha);
  graphics.lineBetween(x - 28 * s, y - 5 * s, x - 20 * s, y + 24 * s);
  graphics.lineBetween(x + 28 * s, y - 5 * s, x + 20 * s, y + 24 * s);
}

function drawCrown(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  pulse: number,
  lw: (width: number) => number,
): void {
  graphics.fillStyle(COLORS.gold, 0.98 * alpha);
  graphics.fillRoundedRect(x - 40 * s, y - 43 * s, 80 * s, 13 * s, 5 * s);
  graphics.fillStyle(COLORS.goldLight, 0.55 * alpha);
  graphics.fillRoundedRect(x - 34 * s, y - 41 * s, 68 * s, 4 * s, 2 * s);
  graphics.lineStyle(lw(2), COLORS.cyan, 0.88 * alpha);
  graphics.lineBetween(x - 31 * s, y - 34 * s, x + 31 * s, y - 34 * s);

  graphics.fillStyle(COLORS.gold, 0.98 * alpha);
  graphics.fillCircle(x, y - 64 * s, 13 * s);
  graphics.fillStyle(COLORS.deepNavy, 0.7 * alpha);
  graphics.fillCircle(x, y - 64 * s, 8 * s);
  graphics.fillStyle(COLORS.goldLight, 0.92 * alpha);
  graphics.fillCircle(x, y - 64 * s, 5.2 * s);
  graphics.lineStyle(lw(2), COLORS.goldLight, (0.62 + pulse * 0.16) * alpha);
  graphics.strokeCircle(x, y - 64 * s, 17 * s);

  graphics.fillStyle(COLORS.cyan, 0.94 * alpha);
  graphics.fillTriangle(x, y - 58 * s, x - 7 * s, y - 38 * s, x + 7 * s, y - 38 * s);
  graphics.fillStyle(COLORS.red, 0.78 * alpha);
  graphics.fillCircle(x, y - 35 * s, 3.1 * s);
}

function drawFacialDetails(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  s: number,
  alpha: number,
  lw: (width: number) => number,
): void {
  graphics.lineStyle(lw(2.1), COLORS.shadow, 0.9 * alpha);
  graphics.lineBetween(x - 20 * s, y - 12 * s, x - 7 * s, y - 9 * s);
  graphics.lineBetween(x + 7 * s, y - 9 * s, x + 20 * s, y - 12 * s);
  graphics.lineStyle(lw(1.3), COLORS.cyanSoft, 0.68 * alpha);
  graphics.lineBetween(x - 25 * s, y - 11 * s, x - 10 * s, y - 7 * s);
  graphics.lineBetween(x + 10 * s, y - 7 * s, x + 25 * s, y - 11 * s);

  graphics.lineStyle(lw(1), COLORS.bronze, 0.5 * alpha);
  graphics.lineBetween(x, y - 5 * s, x - 3 * s, y + 5 * s);
  graphics.fillStyle(COLORS.red, 0.84 * alpha);
  graphics.fillEllipse(x, y + 14 * s, 15 * s, 4.5 * s);
  graphics.fillStyle(COLORS.goldLight, 0.5 * alpha);
  graphics.fillCircle(x - 29 * s, y + 8 * s, 3.5 * s);
  graphics.fillCircle(x + 29 * s, y + 8 * s, 3.5 * s);
}
