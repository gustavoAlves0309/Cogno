import Phaser from "phaser";
import type { ArenaBounds } from "../types";

export type FightVisualStage = 0 | 1 | 2 | 3 | 4;

export interface FightStagePalette {
  primary: number;
  secondary: number;
  glow: number;
}

export interface ArenaVisualState {
  arena: ArenaBounds;
  time: number;
  stage: FightVisualStage;
  transition: number;
}

const STAGE_PALETTES: readonly FightStagePalette[] = [
  { primary: 0xd8b65d, secondary: 0x42d6d2, glow: 0xf8e2a0 },
  { primary: 0x42d6d2, secondary: 0xd8b65d, glow: 0x9bf8ff },
  { primary: 0xe3ad55, secondary: 0xd96359, glow: 0xffdfa0 },
  { primary: 0xf0c96f, secondary: 0x55dce2, glow: 0xffe7a3 },
  { primary: 0xf3d17d, secondary: 0xe46f61, glow: 0xfff0ba },
];

export function getFightStagePalette(stage: FightVisualStage): FightStagePalette {
  return STAGE_PALETTES[stage];
}

export function drawArenaVisuals(
  graphics: Phaser.GameObjects.Graphics,
  state: ArenaVisualState,
): void {
  const { x, y, size } = state.arena;
  const palette = getFightStagePalette(state.stage);
  const transition = Phaser.Math.Clamp(state.transition, 0, 1);
  const pulse = 0.5 + Math.sin(state.time * 0.0022) * 0.5;

  drawStoneSlab(graphics, x, y, size);
  drawFloorPlates(graphics, x, y, size);
  drawErasedCartouche(graphics, x, y, size, palette);
  drawChannels(graphics, x, y, size, palette, pulse, transition, state.stage);
  drawSpatialSeals(graphics, x, y, size, palette, pulse, transition);

  if (transition > 0) {
    graphics.fillStyle(palette.primary, 0.025 + transition * 0.035);
    graphics.fillRect(x + 4, y + 4, size - 8, size - 8);
    graphics.lineStyle(1.4 + transition * 1.8, palette.glow, transition * 0.38);
    graphics.strokeRect(x - 13 - transition * 4, y - 13 - transition * 4, size + 26 + transition * 8, size + 26 + transition * 8);
  }
}

function drawStoneSlab(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
): void {
  graphics.fillStyle(0x03080d, 0.98);
  graphics.fillRect(x - 18, y - 18, size + 36, size + 36);
  graphics.fillStyle(0x0a151c, 0.98);
  graphics.fillRect(x - 15, y - 15, size + 30, size + 30);
  graphics.fillStyle(0x111f26, 0.36);
  graphics.fillRect(x - 11, y - 11, size + 22, size + 22);

  graphics.lineStyle(1, 0x344149, 0.34);
  graphics.strokeRect(x - 18, y - 18, size + 36, size + 36);
  graphics.lineStyle(1, 0x02070b, 0.72);
  for (let index = 1; index < 4; index += 1) {
    const offset = (size * index) / 4;
    const stagger = index % 2 === 0 ? 5 : -5;
    graphics.lineBetween(x + offset + stagger, y - 18, x + offset - stagger, y - 7);
    graphics.lineBetween(x + offset - stagger, y + size + 7, x + offset + stagger, y + size + 18);
    graphics.lineBetween(x - 18, y + offset - stagger, x - 7, y + offset + stagger);
    graphics.lineBetween(x + size + 7, y + offset + stagger, x + size + 18, y + offset - stagger);
  }
}

function drawFloorPlates(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
): void {
  graphics.fillStyle(0x061018, 0.99);
  graphics.fillRect(x, y, size, size);
  graphics.fillStyle(0x10222a, 0.25);
  graphics.fillRect(x + 7, y + 7, size * 0.31 - 7, size * 0.34 - 7);
  graphics.fillRect(x + size * 0.64, y + 7, size * 0.36 - 7, size * 0.27 - 7);
  graphics.fillRect(x + size * 0.31, y + size * 0.62, size * 0.36, size * 0.38 - 7);
  graphics.fillStyle(0x030b11, 0.28);
  graphics.fillRect(x + size * 0.31, y + 7, size * 0.33, size * 0.25);
  graphics.fillRect(x + 7, y + size * 0.67, size * 0.24, size * 0.33 - 7);
  graphics.fillRect(x + size * 0.67, y + size * 0.57, size * 0.33 - 7, size * 0.43 - 7);

  graphics.lineStyle(1, 0x35505a, 0.14);
  graphics.lineBetween(x + size * 0.31, y + 7, x + size * 0.31, y + size * 0.42);
  graphics.lineBetween(x + size * 0.31, y + size * 0.58, x + size * 0.31, y + size - 7);
  graphics.lineBetween(x + size * 0.64, y + 7, x + size * 0.64, y + size * 0.34);
  graphics.lineBetween(x + size * 0.67, y + size * 0.5, x + size * 0.67, y + size - 7);
  graphics.lineBetween(x + 7, y + size * 0.34, x + size * 0.39, y + size * 0.34);
  graphics.lineBetween(x + size * 0.57, y + size * 0.27, x + size - 7, y + size * 0.27);
  graphics.lineBetween(x + 7, y + size * 0.67, x + size * 0.38, y + size * 0.67);
  graphics.lineBetween(x + size * 0.53, y + size * 0.62, x + size - 7, y + size * 0.62);

  graphics.lineStyle(1, 0x8b733d, 0.07);
  graphics.lineBetween(x + 8, y + size * 0.5, x + size * 0.25, y + size * 0.42);
  graphics.lineBetween(x + size * 0.75, y + size * 0.56, x + size - 8, y + size * 0.48);
  graphics.lineBetween(x + size * 0.45, y + 8, x + size * 0.53, y + size * 0.2);
  graphics.lineBetween(x + size * 0.47, y + size * 0.8, x + size * 0.55, y + size - 8);
}

function drawErasedCartouche(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FightStagePalette,
): void {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const width = size * 0.34;
  const height = size * 0.62;

  graphics.lineStyle(1.1, palette.primary, 0.075);
  graphics.strokeEllipse(centerX, centerY, width, height);
  graphics.lineStyle(1, palette.secondary, 0.055);
  graphics.strokeEllipse(centerX, centerY, width * 0.78, height * 0.87);
  graphics.lineStyle(1.2, palette.primary, 0.07);
  graphics.lineBetween(centerX - width * 0.34, centerY + height * 0.52, centerX + width * 0.34, centerY + height * 0.52);
  graphics.lineBetween(centerX - width * 0.26, centerY + height * 0.56, centerX + width * 0.26, centerY + height * 0.56);

  const glyphWidth = size * 0.052;
  const glyphHeight = size * 0.078;
  graphics.lineStyle(1, palette.secondary, 0.07);
  drawDiamondOutline(graphics, centerX, centerY - size * 0.08, glyphWidth, glyphHeight);
  drawDiamondOutline(graphics, centerX, centerY + size * 0.09, glyphWidth * 0.78, glyphHeight * 0.78);
  graphics.lineBetween(centerX, centerY - size * 0.005, centerX, centerY + size * 0.035);
  graphics.lineBetween(centerX - glyphWidth * 0.65, centerY + size * 0.015, centerX + glyphWidth * 0.65, centerY + size * 0.015);
}

function drawChannels(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FightStagePalette,
  pulse: number,
  transition: number,
  stage: FightVisualStage,
): void {
  const stageEnergy = stage / 4;
  graphics.lineStyle(3, 0x02070b, 0.9);
  graphics.strokeRect(x - 3, y - 3, size + 6, size + 6);
  graphics.lineStyle(2.4 + transition * 0.8, palette.primary, 0.68 + pulse * 0.12 + transition * 0.15);
  graphics.strokeRect(x, y, size, size);
  graphics.lineStyle(1.15 + stageEnergy * 0.35, palette.secondary, 0.24 + stageEnergy * 0.13 + pulse * 0.07 + transition * 0.18);
  graphics.strokeRect(x + 4, y + 4, size - 8, size - 8);
  graphics.lineStyle(1, palette.glow, 0.14 + transition * 0.18);
  graphics.strokeRect(x - 10, y - 10, size + 20, size + 20);
}

function drawSpatialSeals(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  size: number,
  palette: FightStagePalette,
  pulse: number,
  transition: number,
): void {
  const alpha = 0.42 + pulse * 0.1 + transition * 0.34;
  const corner = Math.max(20, size * 0.08);
  graphics.lineStyle(2.2, palette.primary, alpha);
  drawCorner(graphics, x - 7, y - 7, 1, 1, corner);
  drawCorner(graphics, x + size + 7, y - 7, -1, 1, corner);
  drawCorner(graphics, x - 7, y + size + 7, 1, -1, corner);
  drawCorner(graphics, x + size + 7, y + size + 7, -1, -1, corner);

  const sealOffset = 10;
  const sealWidth = 4.2 + transition * 1.4;
  const sealHeight = 6.2 + transition * 2;
  graphics.lineStyle(1.2, palette.secondary, 0.34 + pulse * 0.1 + transition * 0.32);
  drawDiamondOutline(graphics, x + size / 2, y - sealOffset, sealWidth, sealHeight);
  drawDiamondOutline(graphics, x + size / 2, y + size + sealOffset, sealWidth, sealHeight);
  drawDiamondOutline(graphics, x - sealOffset, y + size / 2, sealHeight, sealWidth);
  drawDiamondOutline(graphics, x + size + sealOffset, y + size / 2, sealHeight, sealWidth);

  graphics.fillStyle(palette.glow, 0.2 + transition * 0.42);
  graphics.fillCircle(x + size / 2, y - sealOffset, 1.1 + transition);
  graphics.fillCircle(x + size / 2, y + size + sealOffset, 1.1 + transition);
  graphics.fillCircle(x - sealOffset, y + size / 2, 1.1 + transition);
  graphics.fillCircle(x + size + sealOffset, y + size / 2, 1.1 + transition);
}

function drawCorner(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  length: number,
): void {
  graphics.lineBetween(x, y, x + directionX * length, y);
  graphics.lineBetween(x, y, x, y + directionY * length);
  graphics.lineBetween(
    x + directionX * 4,
    y + directionY * 4,
    x + directionX * 9,
    y + directionY * 4,
  );
  graphics.lineBetween(
    x + directionX * 4,
    y + directionY * 4,
    x + directionX * 4,
    y + directionY * 9,
  );
}

function drawDiamondOutline(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
): void {
  graphics.lineBetween(x, y - halfHeight, x + halfWidth, y);
  graphics.lineBetween(x + halfWidth, y, x, y + halfHeight);
  graphics.lineBetween(x, y + halfHeight, x - halfWidth, y);
  graphics.lineBetween(x - halfWidth, y, x, y - halfHeight);
}
