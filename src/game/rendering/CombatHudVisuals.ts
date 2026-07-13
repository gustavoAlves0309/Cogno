import Phaser from "phaser";
import {
  getFightStagePalette,
  type FightVisualStage,
} from "./ArenaVisuals";

export interface CombatHudVisualState {
  time: number;
  stageWidth: number;
  stage: FightVisualStage;
  stability: number;
  maxStability: number;
  lostSealIndex: number;
  stabilityChangeAge: number;
}

export interface LabButtonVisualState {
  x: number;
  y: number;
  width: number;
  height: number;
  hovered: boolean;
}

const BREAK_DURATION_MS = 460;

export function drawCombatHudVisuals(
  graphics: Phaser.GameObjects.Graphics,
  state: CombatHudVisualState,
): void {
  drawStabilitySeals(graphics, state);
  drawStageIndicator(graphics, state);
}

export function drawLabButtonVisuals(
  graphics: Phaser.GameObjects.Graphics,
  state: LabButtonVisualState,
): void {
  const left = state.x - state.width / 2;
  const top = state.y - state.height / 2;
  const right = left + state.width;
  const bottom = top + state.height;
  const alpha = state.hovered ? 0.96 : 0.86;
  const accentAlpha = state.hovered ? 0.92 : 0.64;

  graphics.clear();
  graphics.fillStyle(state.hovered ? 0x10242c : 0x07131a, alpha);
  graphics.fillRect(left + 1, top + 1, state.width - 2, state.height - 2);
  graphics.lineStyle(1, 0xd8b65d, accentAlpha);
  graphics.lineBetween(left + 5, top, right - 5, top);
  graphics.lineBetween(left + 5, bottom, right - 5, bottom);
  graphics.lineBetween(left, top + 5, left, bottom - 5);
  graphics.lineBetween(right, top + 5, right, bottom - 5);
  graphics.lineStyle(1, 0x42d6d2, state.hovered ? 0.48 : 0.28);
  graphics.lineBetween(left + 3, bottom - 4, right - 3, bottom - 4);

  const iconX = left + 14;
  const iconY = state.y;
  graphics.lineStyle(1, 0xd8b65d, accentAlpha);
  drawDiamond(graphics, iconX, iconY, 5, 7);
  graphics.lineStyle(1, 0x7be7eb, state.hovered ? 0.72 : 0.44);
  graphics.lineBetween(iconX - 3, iconY, iconX + 3, iconY);
  graphics.lineBetween(iconX, iconY - 4, iconX, iconY + 4);
  graphics.fillStyle(0xf8e2a0, state.hovered ? 0.92 : 0.7);
  graphics.fillCircle(iconX, iconY, 1.15);
}

function drawStabilitySeals(
  graphics: Phaser.GameObjects.Graphics,
  state: CombatHudVisualState,
): void {
  const y = 41;
  const startX = 23;
  const gap = 22;
  const breath = 0.5 + Math.sin(state.time * 0.0055) * 0.5;

  for (let index = 0; index < state.maxStability; index += 1) {
    const x = startX + index * gap;
    const active = index < state.stability;
    const breaking = index === state.lostSealIndex
      && state.stabilityChangeAge >= 0
      && state.stabilityChangeAge < BREAK_DURATION_MS;

    if (active) {
      graphics.fillStyle(0xf8f1d1, 0.9 + breath * 0.08);
      fillDiamond(graphics, x, y, 4.1, 5.9);
      graphics.lineStyle(1.35, 0xd8b65d, 0.82 + breath * 0.12);
      drawDiamond(graphics, x, y, 7.2, 9.6);
      graphics.lineStyle(0.9, 0x59dce3, 0.4 + breath * 0.18);
      drawDiamond(graphics, x, y, 5.4, 7.3);
      graphics.fillStyle(0xf0cf79, 0.78);
      graphics.fillCircle(x, y, 1.05);
      continue;
    }

    graphics.lineStyle(1.1, 0x6a6b5d, breaking ? 0.44 : 0.26);
    drawDiamond(graphics, x, y, 7.2, 9.6);
    graphics.lineStyle(0.8, 0x31545e, breaking ? 0.34 : 0.18);
    drawDiamond(graphics, x, y, 5.1, 7);

    if (breaking) {
      drawBreakingSeal(graphics, x, y, state.stabilityChangeAge);
    }
  }
}

function drawBreakingSeal(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  age: number,
): void {
  const progress = Phaser.Math.Clamp(age / BREAK_DURATION_MS, 0, 1);
  const energy = 1 - progress;
  const distance = 3 + Phaser.Math.Easing.Cubic.Out(progress) * 12;

  graphics.lineStyle(1.25, 0xff8a7d, energy * 0.82);
  graphics.lineBetween(x - 1, y - 7, x + 1, y - 2);
  graphics.lineBetween(x + 1, y - 2, x - 2, y + 2);
  graphics.lineBetween(x - 2, y + 2, x + 1, y + 7);

  graphics.fillStyle(0xf0cf79, energy * 0.72);
  fillDiamond(graphics, x - distance, y - distance * 0.52, 1.35, 2.1);
  fillDiamond(graphics, x + distance * 0.86, y - distance * 0.72, 1.1, 1.8);
  graphics.fillStyle(0x69e2e7, energy * 0.62);
  fillDiamond(graphics, x - distance * 0.72, y + distance * 0.82, 1, 1.7);
  fillDiamond(graphics, x + distance, y + distance * 0.48, 1.25, 1.9);
}

function drawStageIndicator(
  graphics: Phaser.GameObjects.Graphics,
  state: CombatHudVisualState,
): void {
  const palette = getFightStagePalette(state.stage);
  const centerX = state.stageWidth / 2;
  const centerY = 38;
  const pulse = 0.5 + Math.sin(state.time * 0.0038) * 0.5;
  const numeralHalfWidth = state.stage === 1 || state.stage === 3 ? 7 : state.stage === 2 ? 9 : 4;
  const innerGap = numeralHalfWidth + 8;

  graphics.lineStyle(1, palette.primary, 0.34 + pulse * 0.08);
  graphics.lineBetween(centerX - 48, centerY, centerX - innerGap, centerY);
  graphics.lineBetween(centerX + innerGap, centerY, centerX + 48, centerY);
  graphics.lineStyle(1, palette.secondary, 0.16 + pulse * 0.06);
  graphics.lineBetween(centerX - 42, centerY + 4, centerX - innerGap - 3, centerY + 4);
  graphics.lineBetween(centerX + innerGap + 3, centerY + 4, centerX + 42, centerY + 4);
  graphics.lineStyle(1, palette.secondary, 0.36 + pulse * 0.1);
  drawDiamond(graphics, centerX - 50.5, centerY, 2.5, 3.4);
  drawDiamond(graphics, centerX + 50.5, centerY, 2.5, 3.4);
  graphics.fillStyle(palette.glow, 0.52 + pulse * 0.18);
  graphics.fillCircle(centerX - 50.5, centerY, 0.8);
  graphics.fillCircle(centerX + 50.5, centerY, 0.8);

  graphics.lineStyle(1.35, palette.glow, 0.82 + pulse * 0.12);
  drawRomanNumeral(graphics, centerX, centerY, state.stage);
}

function drawRomanNumeral(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  stage: FightVisualStage,
): void {
  if (stage === 0) {
    drawRomanI(graphics, x, y);
    return;
  }

  if (stage === 1) {
    drawRomanI(graphics, x - 3.4, y);
    drawRomanI(graphics, x + 3.4, y);
    return;
  }

  if (stage === 2) {
    drawRomanI(graphics, x - 5.6, y);
    drawRomanI(graphics, x, y);
    drawRomanI(graphics, x + 5.6, y);
    return;
  }

  if (stage === 3) {
    drawRomanI(graphics, x - 5.5, y);
    drawRomanV(graphics, x + 3.5, y);
    return;
  }

  drawRomanV(graphics, x, y);
}

function drawRomanI(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
  graphics.lineBetween(x, y - 5.5, x, y + 5.5);
  graphics.lineBetween(x - 1.8, y - 5.5, x + 1.8, y - 5.5);
  graphics.lineBetween(x - 1.8, y + 5.5, x + 1.8, y + 5.5);
}

function drawRomanV(graphics: Phaser.GameObjects.Graphics, x: number, y: number): void {
  graphics.lineBetween(x - 4.1, y - 5.5, x, y + 5.5);
  graphics.lineBetween(x, y + 5.5, x + 4.1, y - 5.5);
}

function drawDiamond(
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

function fillDiamond(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
): void {
  graphics.fillTriangle(x, y - halfHeight, x - halfWidth, y, x + halfWidth, y);
  graphics.fillTriangle(x, y + halfHeight, x - halfWidth, y, x + halfWidth, y);
}
