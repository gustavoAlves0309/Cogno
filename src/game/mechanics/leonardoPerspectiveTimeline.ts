import type { PerspectiveFigureId } from "./leonardoPerspectiveGeometry";

export type { PerspectiveFigureId } from "./leonardoPerspectiveGeometry";

export type PerspectiveProfile = "v1" | "v2" | "v3-intro" | "v3-mature";

export type PerspectiveState = "windup" | "active" | "dissipation" | "complete";

export interface PerspectiveTimelineSnapshot {
  readonly profile: PerspectiveProfile;
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly state: PerspectiveState;
  readonly stateProgress: number;
  readonly beatIndex: number | null;
  readonly figureId: PerspectiveFigureId | null;
  readonly guideProgress: number;
  readonly perimeterProgress: number;
  readonly closingProgress: number;
  readonly isDamageActive: boolean;
  readonly damageKey: string | null;
}

interface PerspectiveBeatDefinition {
  readonly figureId: PerspectiveFigureId;
  readonly windupMs: number;
}

const ACTIVE_MS = 650;
const DISSIPATION_MS = 250;
const GUIDE_REVEAL_MS = 180;
const CLOSING_MS = 200;

const PROFILE_BEATS = {
  v1: [{ figureId: "A", windupMs: 2_500 }],
  v2: [
    { figureId: "A", windupMs: 1_800 },
    { figureId: "B", windupMs: 2_200 },
  ],
  "v3-intro": [
    { figureId: "A", windupMs: 1_800 },
    { figureId: "B", windupMs: 1_800 },
    { figureId: "C", windupMs: 2_200 },
  ],
  "v3-mature": [
    { figureId: "A", windupMs: 1_400 },
    { figureId: "B", windupMs: 1_400 },
    { figureId: "C", windupMs: 1_400 },
  ],
} as const satisfies Readonly<Record<PerspectiveProfile, readonly PerspectiveBeatDefinition[]>>;

const PROFILE_LABELS = {
  v1: "Ponto V1",
  v2: "Ponto V2",
  "v3-intro": "Ponto V3 — estreia",
  "v3-mature": "Ponto V3 — madura",
} as const satisfies Readonly<Record<PerspectiveProfile, string>>;

export function getPerspectiveDuration(profile: PerspectiveProfile): number {
  return PROFILE_BEATS[profile].reduce(
    (durationMs, { windupMs }) => durationMs + windupMs + ACTIVE_MS + DISSIPATION_MS,
    0,
  );
}

export function getPerspectiveProfileLabel(profile: PerspectiveProfile): string {
  return PROFILE_LABELS[profile];
}

export function getPerspectiveTimelineSnapshot(
  profile: PerspectiveProfile,
  elapsedMs: number,
  instanceId: string,
): PerspectiveTimelineSnapshot {
  const durationMs = getPerspectiveDuration(profile);
  const safeElapsedMs = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const clampedElapsedMs = clamp(safeElapsedMs, 0, durationMs);

  if (clampedElapsedMs === durationMs) {
    return {
      profile,
      elapsedMs: durationMs,
      durationMs,
      state: "complete",
      stateProgress: 1,
      beatIndex: null,
      figureId: null,
      guideProgress: 1,
      perimeterProgress: 1,
      closingProgress: 1,
      isDamageActive: false,
      damageKey: null,
    };
  }

  let beatStartMs = 0;

  for (const [beatIndex, beat] of PROFILE_BEATS[profile].entries()) {
    const activeStartMs = beatStartMs + beat.windupMs;
    const dissipationStartMs = activeStartMs + ACTIVE_MS;
    const beatEndMs = dissipationStartMs + DISSIPATION_MS;

    if (clampedElapsedMs >= beatEndMs) {
      beatStartMs = beatEndMs;
      continue;
    }

    const beatElapsedMs = clampedElapsedMs - beatStartMs;
    const guideProgress = clamp(beatElapsedMs / GUIDE_REVEAL_MS, 0, 1);
    const closingStartMs = beat.windupMs - CLOSING_MS;
    const closingStartProgress = closingStartMs / (closingStartMs + CLOSING_MS / 2);
    const perimeterProgress = beatElapsedMs <= closingStartMs
      ? clamp((beatElapsedMs / closingStartMs) * closingStartProgress, 0, 1)
      : closingStartProgress + (1 - closingStartProgress) * (
        1 - (1 - clamp((beatElapsedMs - closingStartMs) / CLOSING_MS, 0, 1)) ** 2
      );
    const closingProgress = clamp(
      (beatElapsedMs - (beat.windupMs - CLOSING_MS)) / CLOSING_MS,
      0,
      1,
    );

    let state: Exclude<PerspectiveState, "complete">;
    let stateElapsedMs: number;
    let stateDurationMs: number;

    if (clampedElapsedMs < activeStartMs) {
      state = "windup";
      stateElapsedMs = beatElapsedMs;
      stateDurationMs = beat.windupMs;
    } else if (clampedElapsedMs < dissipationStartMs) {
      state = "active";
      stateElapsedMs = clampedElapsedMs - activeStartMs;
      stateDurationMs = ACTIVE_MS;
    } else {
      state = "dissipation";
      stateElapsedMs = clampedElapsedMs - dissipationStartMs;
      stateDurationMs = DISSIPATION_MS;
    }

    const isDamageActive = state === "active";

    return {
      profile,
      elapsedMs: clampedElapsedMs,
      durationMs,
      state,
      stateProgress: clamp(stateElapsedMs / stateDurationMs, 0, 1),
      beatIndex,
      figureId: beat.figureId,
      guideProgress,
      perimeterProgress,
      closingProgress,
      isDamageActive,
      damageKey: isDamageActive ? `ponto:${instanceId}:${beatIndex}` : null,
    };
  }

  throw new Error(`Perspective profile ${profile} has no beat for ${clampedElapsedMs} ms`);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
