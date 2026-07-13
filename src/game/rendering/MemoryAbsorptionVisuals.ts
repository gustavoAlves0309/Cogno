import Phaser from "phaser";

export const MEMORY_ABSORPTION_DURATION_MS = 2500;

export interface MemoryAbsorptionPalette {
  primary: number;
  secondary: number;
  core: number;
}

export interface MemoryAbsorptionProgress {
  recognition: number;
  dissolution: number;
  transfer: number;
  integration: number;
}

export interface MemoryAbsorptionBossState {
  alpha: number;
  scale: number;
  auraAlpha: number;
  auraScale: number;
  collapse: number;
  overload: number;
  yOffset: number;
}

export interface MemorySealVisualState {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  progress: number;
  palette: MemoryAbsorptionPalette;
}

export type DrawMemorySeal = (
  graphics: Phaser.GameObjects.Graphics,
  state: MemorySealVisualState,
) => void;

interface VisualAnchor {
  x: number;
  y: number;
}

interface MemoryAbsorptionVisualOptions {
  elapsedMs: number;
  source: VisualAnchor;
  target: VisualAnchor;
  sourceRadius: number;
  targetRadius: number;
  palette: MemoryAbsorptionPalette;
  drawSeal: DrawMemorySeal;
}

const RECOGNITION_END_MS = 400;
const DISSOLUTION_START_MS = 400;
const DISSOLUTION_END_MS = 1350;
const TRANSFER_START_MS = 900;
const TRANSFER_END_MS = 2050;
const INTEGRATION_START_MS = 1850;

export function getMemoryAbsorptionProgress(elapsedMs: number): MemoryAbsorptionProgress {
  return {
    recognition: segmentProgress(elapsedMs, 0, RECOGNITION_END_MS),
    dissolution: segmentProgress(elapsedMs, DISSOLUTION_START_MS, DISSOLUTION_END_MS),
    transfer: segmentProgress(elapsedMs, TRANSFER_START_MS, TRANSFER_END_MS),
    integration: segmentProgress(elapsedMs, INTEGRATION_START_MS, MEMORY_ABSORPTION_DURATION_MS),
  };
}

export function getMemoryAbsorptionBossState(elapsedMs: number): MemoryAbsorptionBossState {
  const progress = getMemoryAbsorptionProgress(elapsedMs);
  const recognition = Phaser.Math.Easing.Cubic.Out(progress.recognition);
  const dissolution = Phaser.Math.Easing.Cubic.InOut(progress.dissolution);

  return {
    alpha: 1 - dissolution,
    scale: 1 - dissolution * 0.18,
    auraAlpha: (1 - dissolution) * (1 - recognition * 0.12),
    auraScale: 1 - recognition * 0.16 - dissolution * 0.18,
    collapse: dissolution,
    overload: Math.sin(progress.recognition * Math.PI) * (1 - dissolution),
    yOffset: dissolution * 7,
  };
}

export function drawMemoryAbsorptionVisuals(
  graphics: Phaser.GameObjects.Graphics,
  options: MemoryAbsorptionVisualOptions,
): void {
  const elapsedMs = Phaser.Math.Clamp(options.elapsedMs, 0, MEMORY_ABSORPTION_DURATION_MS);
  const progress = getMemoryAbsorptionProgress(elapsedMs);

  drawRecognition(graphics, options, progress);
  drawTransferThreads(graphics, options, progress);
  drawKnowledgeFragments(graphics, options, elapsedMs);
  drawIntegration(graphics, options, progress);
}

function drawRecognition(
  graphics: Phaser.GameObjects.Graphics,
  options: MemoryAbsorptionVisualOptions,
  progress: MemoryAbsorptionProgress,
): void {
  if (progress.recognition <= 0 || progress.dissolution >= 1) {
    return;
  }

  const recognition = Phaser.Math.Easing.Cubic.Out(progress.recognition);
  const fade = 1 - Phaser.Math.Easing.Cubic.In(progress.dissolution);
  const pulse = Math.sin(progress.recognition * Math.PI);
  const radius = options.sourceRadius * (1.42 - recognition * 0.34);

  graphics.fillStyle(options.palette.primary, (0.035 + pulse * 0.055) * fade);
  graphics.fillCircle(options.source.x, options.source.y, radius * 0.9);
  graphics.lineStyle(1.8, options.palette.primary, (0.24 + pulse * 0.5) * fade);
  graphics.strokeCircle(options.source.x, options.source.y, radius);
  graphics.lineStyle(1.2, options.palette.secondary, (0.18 + pulse * 0.36) * fade);
  graphics.strokeEllipse(options.source.x, options.source.y, radius * 2.18, radius * 1.34);

  graphics.lineStyle(1.1, options.palette.core, pulse * 0.42 * fade);
  for (let index = 0; index < 8; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 8;
    const inner = radius * 0.78;
    const outer = radius * (0.94 + pulse * 0.17);
    graphics.lineBetween(
      options.source.x + Math.cos(angle) * inner,
      options.source.y + Math.sin(angle) * inner * 0.64,
      options.source.x + Math.cos(angle) * outer,
      options.source.y + Math.sin(angle) * outer * 0.64,
    );
  }
}

function drawTransferThreads(
  graphics: Phaser.GameObjects.Graphics,
  options: MemoryAbsorptionVisualOptions,
  progress: MemoryAbsorptionProgress,
): void {
  if (progress.transfer <= 0 || progress.integration >= 0.96) {
    return;
  }

  const visibleProgress = Phaser.Math.Easing.Sine.InOut(progress.transfer);
  const fade = 1 - Phaser.Math.Clamp((progress.integration - 0.62) / 0.34, 0, 1);

  for (let index = 0; index < 3; index += 1) {
    const direction = index - 1;
    const source = {
      x: options.source.x + direction * options.sourceRadius * 0.22,
      y: options.source.y + Math.abs(direction) * options.sourceRadius * 0.08,
    };
    const target = {
      x: options.target.x + direction * options.targetRadius * 0.55,
      y: options.target.y,
    };
    const bend = direction * (32 + options.sourceRadius * 0.16);
    const control = {
      x: Phaser.Math.Linear(source.x, target.x, 0.52) + bend,
      y: Phaser.Math.Linear(source.y, target.y, 0.37),
    };
    const color = index === 1 ? options.palette.primary : options.palette.secondary;
    const alpha = (index === 1 ? 0.34 : 0.21) * fade;

    graphics.lineStyle(index === 1 ? 1.35 : 0.9, color, alpha);
    strokeQuadraticPath(graphics, source, control, target, visibleProgress, 18);
  }
}

function drawKnowledgeFragments(
  graphics: Phaser.GameObjects.Graphics,
  options: MemoryAbsorptionVisualOptions,
  elapsedMs: number,
): void {
  const fragmentScale = Phaser.Math.Clamp(options.sourceRadius / 72, 0.72, 1.16);

  for (let index = 0; index < 26; index += 1) {
    const spawnAt = DISSOLUTION_START_MS + (index % 8) * 48 + Math.floor(index / 8) * 22;
    const departAt = TRANSFER_START_MS + (index % 8) * 64 + Math.floor(index / 8) * 18;
    const arrivalAt = departAt + 720 + (index % 5) * 72;

    if (elapsedMs < spawnAt || elapsedMs >= arrivalAt) {
      continue;
    }

    const angle = index * 2.399963229728653 + Math.sin(index * 5.17) * 0.23;
    const radial = 0.24 + (index % 7) * 0.095;
    const source = {
      x: options.source.x + Math.cos(angle) * options.sourceRadius * radial,
      y: options.source.y + Math.sin(angle) * options.sourceRadius * radial * 0.66,
    };
    const peelDistance = (10 + (index % 6) * 3.4) * fragmentScale;
    const peeled = {
      x: source.x + Math.cos(angle) * peelDistance,
      y: source.y + Math.sin(angle) * peelDistance * 0.72,
    };

    let x: number;
    let y: number;
    let alpha: number;

    if (elapsedMs < departAt) {
      const peelProgress = Phaser.Math.Easing.Cubic.Out(segmentProgress(elapsedMs, spawnAt, departAt));
      x = Phaser.Math.Linear(source.x, peeled.x, peelProgress);
      y = Phaser.Math.Linear(source.y, peeled.y, peelProgress) - Math.sin(peelProgress * Math.PI) * 4;
      alpha = Math.min(0.82, peelProgress * 1.8);
    } else {
      const travelProgress = Phaser.Math.Easing.Sine.InOut(segmentProgress(elapsedMs, departAt, arrivalAt));
      const side = index % 2 === 0 ? -1 : 1;
      const control = {
        x: Phaser.Math.Linear(peeled.x, options.target.x, 0.5) + side * (26 + (index % 4) * 9),
        y: Phaser.Math.Linear(peeled.y, options.target.y, 0.34) - (index % 3) * 7,
      };
      const targetAngle = angle + index * 0.41;
      const target = {
        x: options.target.x + Math.cos(targetAngle) * options.targetRadius * 0.24,
        y: options.target.y + Math.sin(targetAngle) * options.targetRadius * 0.24,
      };
      const point = quadraticPoint(peeled, control, target, travelProgress);
      x = point.x;
      y = point.y;
      alpha = 0.84 * (1 - Phaser.Math.Clamp((travelProgress - 0.82) / 0.18, 0, 1));
    }

    const size = (1.25 + (index % 4) * 0.48) * fragmentScale;
    const color = index % 3 === 0 ? options.palette.secondary : options.palette.primary;
    graphics.fillStyle(color, alpha);

    if (index % 4 === 0) {
      graphics.fillTriangle(x, y - size, x + size * 0.8, y, x, y + size);
      graphics.fillTriangle(x, y - size, x - size * 0.8, y, x, y + size);
    } else if (index % 4 === 1) {
      graphics.fillRect(x - size * 0.48, y - size * 0.48, size * 0.96, size * 0.96);
    } else {
      graphics.fillCircle(x, y, size * 0.58);
    }
  }
}

function drawIntegration(
  graphics: Phaser.GameObjects.Graphics,
  options: MemoryAbsorptionVisualOptions,
  progress: MemoryAbsorptionProgress,
): void {
  if (progress.integration <= 0 || progress.integration >= 1) {
    return;
  }

  const integration = Phaser.Math.Easing.Cubic.Out(progress.integration);
  const sealAlpha = Math.sin(progress.integration * Math.PI) * 0.92;
  const corePulse = Math.sin(progress.integration * Math.PI);
  const pulseProgress = Phaser.Math.Clamp((progress.integration - 0.14) / 0.86, 0, 1);
  const pulseEased = Phaser.Math.Easing.Cubic.Out(pulseProgress);

  graphics.fillStyle(options.palette.core, corePulse * 0.12);
  graphics.fillCircle(
    options.target.x,
    options.target.y,
    options.targetRadius * (1.9 + corePulse * 1.35),
  );
  graphics.lineStyle(1.7, options.palette.primary, (1 - pulseProgress) * 0.68);
  graphics.strokeCircle(
    options.target.x,
    options.target.y,
    options.targetRadius * (2.1 + pulseEased * 8.4),
  );
  graphics.lineStyle(1.05, options.palette.secondary, (1 - pulseProgress) * 0.46);
  graphics.strokeCircle(
    options.target.x,
    options.target.y,
    options.targetRadius * (3.2 + pulseEased * 10.2),
  );

  options.drawSeal(graphics, {
    x: options.target.x,
    y: options.target.y,
    radius: options.targetRadius * (2.05 + integration * 0.28),
    alpha: sealAlpha,
    progress: integration,
    palette: options.palette,
  });
}

function strokeQuadraticPath(
  graphics: Phaser.GameObjects.Graphics,
  start: VisualAnchor,
  control: VisualAnchor,
  end: VisualAnchor,
  progress: number,
  steps: number,
): void {
  const completedSteps = Math.max(1, Math.ceil(steps * Phaser.Math.Clamp(progress, 0, 1)));
  graphics.beginPath();
  graphics.moveTo(start.x, start.y);

  for (let step = 1; step <= completedSteps; step += 1) {
    const t = Math.min(progress, step / steps);
    const point = quadraticPoint(start, control, end, t);
    graphics.lineTo(point.x, point.y);
  }

  graphics.strokePath();
}

function quadraticPoint(
  start: VisualAnchor,
  control: VisualAnchor,
  end: VisualAnchor,
  progress: number,
): VisualAnchor {
  const inverse = 1 - progress;
  return {
    x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * end.x,
    y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * end.y,
  };
}

function segmentProgress(value: number, start: number, end: number): number {
  return Phaser.Math.Clamp((value - start) / (end - start), 0, 1);
}
