import Phaser from "phaser";
import type { ArenaBounds } from "../types";

export type LeonardoVisualStage = 0 | 1 | 2 | 3;

export interface LeonardoArenaVisualState {
  arena: ArenaBounds;
  time: number;
  stage: LeonardoVisualStage;
  transition: number;
  ultimateOpening?: number;
}

// Arena colors intentionally remain in a narrow sepia/value range. Functional
// cyan, turquoise and red belong exclusively to attack renderers.
const PALETTES = [
  { frame: 0x33291f, ink: 0x65513b, fiber: 0xa48659, paperTop: 0xddc796, paperBottom: 0xc7aa72, light: 0xead6a7 },
  { frame: 0x30271e, ink: 0x604b37, fiber: 0x9c7d53, paperTop: 0xd8bf88, paperBottom: 0xc09f68, light: 0xe5ce9a },
  { frame: 0x2d251e, ink: 0x5b4837, fiber: 0x92734e, paperTop: 0xd1b680, paperBottom: 0xb89563, light: 0xdfc591 },
  { frame: 0x29231e, ink: 0x554538, fiber: 0x886d4e, paperTop: 0xc6ab79, paperBottom: 0xaa8c61, light: 0xd6bc8e },
] as const;

export function drawLeonardoArenaVisuals(
  graphics: Phaser.GameObjects.Graphics,
  state: LeonardoArenaVisualState,
): void {
  const palette = PALETTES[state.stage];
  const transition = Phaser.Math.Clamp(state.transition, 0, 1);
  const opening = Phaser.Math.Clamp(state.ultimateOpening ?? 0, 0, 1);
  const breath = 0.5 + Math.sin(state.time * 0.0012) * 0.5;

  graphics.clear();
  drawPaperSurface(graphics, state.arena, palette, opening);
  drawPaperFibers(graphics, state.arena, palette, breath);
  drawQuietRuling(graphics, state.arena, palette, state.stage);
  drawMarginalia(graphics, state.arena, palette, transition, opening);
  drawPatina(graphics, state.arena, palette, state.stage, opening);
}

function drawPaperSurface(
  graphics: Phaser.GameObjects.Graphics,
  arena: ArenaBounds,
  palette: (typeof PALETTES)[number],
  opening: number,
): void {
  const outer = 18;
  graphics.fillStyle(0x070706, 0.96);
  graphics.fillRect(arena.x - outer, arena.y - outer, arena.size + outer * 2, arena.size + outer * 2);
  graphics.fillStyle(palette.frame, 0.94);
  graphics.fillRect(arena.x - 12, arena.y - 12, arena.size + 24, arena.size + 24);
  graphics.fillStyle(0x17130f, 0.38);
  graphics.fillRect(arena.x - 7, arena.y - 7, arena.size + 14, arena.size + 14);

  const darken = Math.round(opening * 14);
  const bottom = subtractRgb(palette.paperBottom, darken);
  graphics.fillGradientStyle(
    palette.paperTop,
    palette.paperTop,
    bottom,
    bottom,
    0.98,
    0.98,
    0.98,
    0.98,
  );
  graphics.fillRect(arena.x, arena.y, arena.size, arena.size);

  // The frame is readable but never brighter than an active safe-space border.
  graphics.lineStyle(2.4, palette.frame, 0.72);
  graphics.strokeRect(arena.x - 3, arena.y - 3, arena.size + 6, arena.size + 6);
  graphics.lineStyle(1, palette.light, 0.25);
  graphics.strokeRect(arena.x + 1, arena.y + 1, arena.size - 2, arena.size - 2);
}

function drawPaperFibers(
  graphics: Phaser.GameObjects.Graphics,
  arena: ArenaBounds,
  palette: (typeof PALETTES)[number],
  breath: number,
): void {
  const horizontalAlpha = 0.025 + breath * 0.008;
  graphics.lineStyle(1, palette.light, horizontalAlpha);
  for (let index = 0; index < 12; index += 1) {
    const y = arena.y + arena.size * (0.04 + index * 0.083);
    const inset = 7 + (index % 4) * 5;
    graphics.lineBetween(arena.x + inset, y, arena.x + arena.size - inset * 0.6, y + (index % 2 === 0 ? 1 : -1));
  }

  graphics.lineStyle(0.8, palette.fiber, 0.035);
  for (let index = 0; index < 9; index += 1) {
    const x = arena.x + arena.size * (0.06 + index * 0.11);
    const startY = arena.y + 8 + (index % 3) * 9;
    graphics.lineBetween(x, startY, x + 3, arena.y + arena.size - 7 - (index % 4) * 5);
  }
}

function drawQuietRuling(
  graphics: Phaser.GameObjects.Graphics,
  arena: ArenaBounds,
  palette: (typeof PALETTES)[number],
  stage: LeonardoVisualStage,
): void {
  const left = arena.x + arena.size * 0.075;
  const right = arena.x + arena.size * 0.925;
  const top = arena.y + arena.size * 0.085;
  const bottom = arena.y + arena.size * 0.915;
  const alpha = 0.075 + stage * 0.008;

  graphics.lineStyle(0.8, palette.ink, alpha);
  graphics.lineBetween(left, top, left, bottom);
  graphics.lineBetween(right, top, right, bottom);

  // Short manuscript ticks suggest a worked page but avoid any complete grid,
  // converging line or colored shape that could be mistaken for a mechanic.
  for (let index = 0; index < 7; index += 1) {
    const y = arena.y + arena.size * (0.14 + index * 0.12);
    graphics.lineBetween(left, y, left + arena.size * 0.035, y);
    graphics.lineBetween(right - arena.size * 0.035, y, right, y);
  }
}

function drawMarginalia(
  graphics: Phaser.GameObjects.Graphics,
  arena: ArenaBounds,
  palette: (typeof PALETTES)[number],
  transition: number,
  opening: number,
): void {
  const inset = arena.size * 0.038;
  const length = arena.size * 0.045;
  const alpha = 0.09 + transition * 0.025 + opening * 0.018;
  graphics.lineStyle(0.9, palette.ink, alpha);

  for (const [x, y, dx, dy] of [
    [arena.x + inset, arena.y + inset, 1, 1],
    [arena.x + arena.size - inset, arena.y + inset, -1, 1],
    [arena.x + inset, arena.y + arena.size - inset, 1, -1],
    [arena.x + arena.size - inset, arena.y + arena.size - inset, -1, -1],
  ] as const) {
    graphics.lineBetween(x, y, x + dx * length, y);
    graphics.lineBetween(x, y, x, y + dy * length);
  }

  // A tiny folio mark lives outside the central play-reading area.
  const markX = arena.x + arena.size * 0.885;
  const markY = arena.y + arena.size * 0.09;
  graphics.lineStyle(0.75, palette.ink, alpha * 0.8);
  graphics.strokeCircle(markX, markY, arena.size * 0.018);
  graphics.lineBetween(markX - arena.size * 0.022, markY, markX + arena.size * 0.022, markY);
}

function drawPatina(
  graphics: Phaser.GameObjects.Graphics,
  arena: ArenaBounds,
  palette: (typeof PALETTES)[number],
  stage: LeonardoVisualStage,
  opening: number,
): void {
  const marks = [
    [0.12, 0.22, 0.013],
    [0.82, 0.16, 0.009],
    [0.91, 0.64, 0.016],
    [0.18, 0.86, 0.011],
    [0.69, 0.91, 0.008],
    [0.07, 0.56, 0.007],
    [0.77, 0.42, 0.006],
    [0.39, 0.08, 0.006],
  ] as const;
  const count = Math.min(marks.length, 4 + stage);
  for (let index = 0; index < count; index += 1) {
    const [nx, ny, nr] = marks[index];
    const x = arena.x + nx * arena.size;
    const y = arena.y + ny * arena.size;
    const radius = nr * arena.size * (1 + opening * 0.22);
    const markAlpha = 0.035 + stage * 0.006 + opening * 0.008;
    graphics.fillStyle(index % 3 === 0 ? palette.frame : palette.ink, markAlpha);
    graphics.fillCircle(x, y, radius);
    if (index % 2 === 0) {
      graphics.fillCircle(x + radius * 1.15, y + radius * 0.25, radius * 0.28);
    }
  }

  // Subtle edge washes leave the center visually calm for attack fills.
  graphics.fillStyle(palette.frame, 0.025 + opening * 0.015);
  graphics.fillRect(arena.x, arena.y, arena.size, Math.max(2, arena.size * 0.022));
  graphics.fillRect(arena.x, arena.y + arena.size * 0.978, arena.size, arena.size * 0.022);
}

function subtractRgb(color: number, amount: number): number {
  const red = Math.max(0, ((color >> 16) & 0xff) - amount);
  const green = Math.max(0, ((color >> 8) & 0xff) - amount);
  const blue = Math.max(0, (color & 0xff) - amount);
  return (red << 16) | (green << 8) | blue;
}
