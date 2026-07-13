import Phaser from "phaser";
import type { LeonardoVisualStage } from "./LeonardoArenaVisuals";

export interface LeonardoHudVisualState {
  time: number;
  stageWidth: number;
  stage: LeonardoVisualStage;
  stability: number;
  maxStability: number;
  lostSealIndex: number;
  stabilityChangeAge: number;
}

const BREAK_DURATION_MS = 460;
const STAGE_COLORS = [
  { primary: 0xa64236, secondary: 0x6298aa, glow: 0xf1d99d },
  { primary: 0xb46b39, secondary: 0x6e9e9d, glow: 0xf1d191 },
  { primary: 0xb44646, secondary: 0x8fa6b8, glow: 0xf2cfa0 },
  { primary: 0xd25a48, secondary: 0x7bb8c7, glow: 0xffe1a3 },
] as const;

export function drawLeonardoHudVisuals(
  graphics: Phaser.GameObjects.Graphics,
  state: LeonardoHudVisualState,
): void {
  drawKnowledgeSeals(graphics, state);
  drawPerspectiveStage(graphics, state);
}

function drawKnowledgeSeals(graphics: Phaser.GameObjects.Graphics, state: LeonardoHudVisualState): void {
  const y = 41;
  const startX = 24;
  const gap = 24;
  const breath = 0.5 + Math.sin(state.time * 0.005) * 0.5;
  const color = STAGE_COLORS[state.stage];
  for (let index = 0; index < state.maxStability; index += 1) {
    const x = startX + index * gap;
    const active = index < state.stability;
    const breaking = index === state.lostSealIndex
      && state.stabilityChangeAge >= 0
      && state.stabilityChangeAge < BREAK_DURATION_MS;
    drawEyeSeal(graphics, x, y, active ? 1 : 0.28, color, breath, breaking ? state.stabilityChangeAge : -1);
  }
}

function drawEyeSeal(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  alpha: number,
  color: (typeof STAGE_COLORS)[number],
  breath: number,
  breakAge: number,
): void {
  const breaking = breakAge >= 0;
  const breakProgress = breaking ? Phaser.Math.Clamp(breakAge / BREAK_DURATION_MS, 0, 1) : 0;
  const fade = alpha * (1 - breakProgress * 0.72);
  graphics.lineStyle(1.15, color.primary, (0.62 + breath * 0.2) * fade);
  graphics.beginPath();
  graphics.moveTo(x - 7, y);
  graphics.lineTo(x, y - 4.3);
  graphics.lineTo(x + 7, y);
  graphics.lineTo(x, y + 4.3);
  graphics.closePath();
  graphics.strokePath();
  graphics.lineStyle(0.85, color.secondary, 0.72 * fade);
  graphics.strokeCircle(x, y, 6.6);
  graphics.fillStyle(color.glow, 0.86 * fade);
  graphics.fillCircle(x, y, 1.45 + breath * 0.35);

  if (breaking) {
    const distance = 4 + breakProgress * 12;
    graphics.fillStyle(color.primary, (1 - breakProgress) * 0.66);
    graphics.fillCircle(x - distance, y - distance * 0.35, 1.5);
    graphics.fillCircle(x + distance * 0.7, y + distance * 0.44, 1.2);
    graphics.lineStyle(1.1, color.primary, (1 - breakProgress) * 0.78);
    graphics.lineBetween(x - 5, y - 4, x + 4, y + 4);
  }
}

function drawPerspectiveStage(graphics: Phaser.GameObjects.Graphics, state: LeonardoHudVisualState): void {
  const color = STAGE_COLORS[state.stage];
  const x = state.stageWidth / 2;
  const y = 38;
  const pulse = 0.5 + Math.sin(state.time * 0.004) * 0.5;
  graphics.lineStyle(1.1, color.primary, 0.38 + pulse * 0.12);
  graphics.lineBetween(x - 52, y, x - 12, y);
  graphics.lineBetween(x + 12, y, x + 52, y);
  graphics.lineStyle(0.8, color.secondary, 0.3 + pulse * 0.1);
  graphics.lineBetween(x - 45, y + 4, x - 14, y + 4);
  graphics.lineBetween(x + 14, y + 4, x + 45, y + 4);
  graphics.fillStyle(color.glow, 0.78 + pulse * 0.16);
  graphics.fillCircle(x, y, 2.3);
  graphics.lineStyle(1.1, color.secondary, 0.72);
  graphics.strokeCircle(x, y, 7.4);
  const label = state.stage === 3 ? "V" : `${state.stage + 1}`;
  graphics.lineStyle(1.4, color.glow, 0.86);
  if (label === "V") {
    graphics.lineBetween(x - 4, y - 6, x, y + 6);
    graphics.lineBetween(x, y + 6, x + 4, y - 6);
  } else {
    const offset = label === "1" ? 0 : label === "2" ? -3 : -5;
    for (let index = 0; index < Number(label); index += 1) {
      const lineX = x + offset + index * 5;
      graphics.lineBetween(lineX, y - 6, lineX, y + 6);
    }
  }
}
