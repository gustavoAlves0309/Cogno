export type WingProfile = "v1" | "v2" | "v3-intro" | "v3-mature";

export type WingPassDirection = "down" | "up" | "diagonal";

export type WingGapSlot = "left" | "right" | "center";

export type WingTimelineState =
  | "windup"
  | "active"
  | "cadence"
  | "dissolve"
  | "register"
  | "complete";

export interface WingPassDefinition {
  readonly direction: WingPassDirection;
  readonly slot: WingGapSlot;
  readonly gapCenter: number;
  readonly gapWidthInPlayerDiameters: number;
  readonly diagonalAngleDeg: number;
}

export interface WingPassPreview {
  readonly role: "current" | "next";
  readonly passIndex: number;
  readonly definition: WingPassDefinition;
  readonly isDamageActive: boolean;
  readonly damageKey: string | null;
}

export interface WingTimelineSnapshot {
  readonly profile: WingProfile;
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly state: WingTimelineState;
  readonly stateProgress: number;
  readonly passIndex: number | null;
  readonly passDefinition: WingPassDefinition | null;
  readonly passProgress: number;
  readonly currentPreview: WingPassPreview | null;
  readonly nextPreview: WingPassPreview | null;
  readonly bossCueProgress: number;
  readonly pageCueProgress: number;
  readonly spatialTelegraphProgress: number;
  readonly isSpatialTelegraphVisible: boolean;
  readonly materializationProgress: number;
  readonly dissolutionProgress: number;
  readonly isDamageActive: boolean;
  readonly damageKey: string | null;
}

interface WingProfileTiming {
  readonly windupMs: number;
  readonly traversalMs: number;
  readonly cadenceMs: number;
  readonly finishMs: number;
}

const REGISTER_MS = 300;
const MATURE_PAGE_CUE_MS = 650;
const MATURE_SPATIAL_TELEGRAPH_START_MS = 300;

const SLOT_CENTERS = {
  left: 0.25,
  right: 0.75,
  center: 0.5,
} as const satisfies Readonly<Record<WingGapSlot, number>>;

const V1_PASSES = freezePasses([
  createPass("down", "left", 3),
  createPass("down", "right", 3),
]);

const V2_PASSES = freezePasses([
  createPass("down", "left", 2.5),
  createPass("up", "right", 2.5),
  createPass("down", "center", 2.5),
]);

const V3_PASSES = freezePasses([
  createPass("down", "left", 2.2),
  createPass("up", "right", 2.2),
  createPass("diagonal", "center", 2.2, 20),
]);

export const WING_PASS_DEFINITIONS = Object.freeze({
  v1: V1_PASSES,
  v2: V2_PASSES,
  "v3-intro": V3_PASSES,
  "v3-mature": V3_PASSES,
}) satisfies Readonly<Record<WingProfile, readonly WingPassDefinition[]>>;

const PROFILE_TIMINGS = Object.freeze({
  v1: Object.freeze({ windupMs: 1_800, traversalMs: 1_400, cadenceMs: 1_100, finishMs: 1_300 }),
  v2: Object.freeze({ windupMs: 1_500, traversalMs: 1_150, cadenceMs: 900, finishMs: 1_250 }),
  "v3-intro": Object.freeze({ windupMs: 1_500, traversalMs: 1_000, cadenceMs: 700, finishMs: 1_100 }),
  "v3-mature": Object.freeze({ windupMs: 1_150, traversalMs: 1_000, cadenceMs: 700, finishMs: 900 }),
}) satisfies Readonly<Record<WingProfile, WingProfileTiming>>;

const PROFILE_LABELS = Object.freeze({
  v1: "Asa V1",
  v2: "Asa V2",
  "v3-intro": "Asa V3 estreia",
  "v3-mature": "Asa V3 madura",
}) satisfies Readonly<Record<WingProfile, string>>;

export function getWingPassDefinitions(profile: WingProfile): readonly WingPassDefinition[] {
  return WING_PASS_DEFINITIONS[profile];
}

export function getWingProfileLabel(profile: WingProfile): string {
  return PROFILE_LABELS[profile];
}

export function getWingDuration(profile: WingProfile): number {
  const timing = PROFILE_TIMINGS[profile];
  const passCount = WING_PASS_DEFINITIONS[profile].length;

  return timing.windupMs
    + timing.traversalMs * passCount
    + timing.cadenceMs * (passCount - 1)
    + timing.finishMs;
}

export function getWingTimelineSnapshot(
  profile: WingProfile,
  ageMs: number,
  instanceId: string,
): WingTimelineSnapshot {
  const definitions = WING_PASS_DEFINITIONS[profile];
  const timing = PROFILE_TIMINGS[profile];
  const durationMs = getWingDuration(profile);
  const safeAgeMs = Number.isFinite(ageMs) ? ageMs : 0;
  const elapsedMs = clamp(safeAgeMs, 0, durationMs);
  const cueDurationMs = profile === "v3-mature" ? MATURE_PAGE_CUE_MS : timing.windupMs;
  const spatialTelegraphStartMs = profile === "v3-mature"
    ? MATURE_SPATIAL_TELEGRAPH_START_MS
    : 0;
  const bossCueProgress = clamp(elapsedMs / cueDurationMs, 0, 1);
  const spatialTelegraphProgress = clamp(
    (elapsedMs - spatialTelegraphStartMs) / (timing.windupMs - spatialTelegraphStartMs),
    0,
    1,
  );

  if (elapsedMs === durationMs) {
    return createSnapshot({
      profile,
      elapsedMs,
      durationMs,
      state: "complete",
      stateProgress: 1,
      bossCueProgress,
      spatialTelegraphProgress,
    });
  }

  if (elapsedMs < timing.windupMs) {
    const isSpatialTelegraphVisible = elapsedMs >= spatialTelegraphStartMs;
    return createSnapshot({
      profile,
      elapsedMs,
      durationMs,
      state: "windup",
      stateProgress: elapsedMs / timing.windupMs,
      passIndex: 0,
      passDefinition: definitions[0],
      currentPreview: isSpatialTelegraphVisible
        ? createPreview(definitions, 0, "current", false, instanceId)
        : null,
      nextPreview: isSpatialTelegraphVisible
        ? createPreview(definitions, 1, "next", false, instanceId)
        : null,
      bossCueProgress,
      spatialTelegraphProgress,
      isSpatialTelegraphVisible,
    });
  }

  let cursorMs: number = timing.windupMs;

  for (let passIndex = 0; passIndex < definitions.length; passIndex += 1) {
    const activeEndMs = cursorMs + timing.traversalMs;

    if (elapsedMs < activeEndMs) {
      const stateProgress = (elapsedMs - cursorMs) / timing.traversalMs;
      return createSnapshot({
        profile,
        elapsedMs,
        durationMs,
        state: "active",
        stateProgress,
        passIndex,
        passDefinition: definitions[passIndex],
        passProgress: stateProgress,
        currentPreview: createPreview(definitions, passIndex, "current", true, instanceId),
        nextPreview: createPreview(definitions, passIndex + 1, "next", false, instanceId),
        bossCueProgress,
        spatialTelegraphProgress,
        isSpatialTelegraphVisible: true,
        materializationProgress: stateProgress,
        isDamageActive: true,
        damageKey: createDamageKey(instanceId, passIndex),
      });
    }

    cursorMs = activeEndMs;

    if (passIndex === definitions.length - 1) {
      break;
    }

    const cadenceEndMs = cursorMs + timing.cadenceMs;

    if (elapsedMs < cadenceEndMs) {
      const stateProgress = (elapsedMs - cursorMs) / timing.cadenceMs;
      const upcomingPassIndex = passIndex + 1;
      return createSnapshot({
        profile,
        elapsedMs,
        durationMs,
        state: "cadence",
        stateProgress,
        passIndex: upcomingPassIndex,
        passDefinition: definitions[upcomingPassIndex],
        currentPreview: createPreview(definitions, upcomingPassIndex, "current", false, instanceId),
        nextPreview: createPreview(definitions, upcomingPassIndex + 1, "next", false, instanceId),
        bossCueProgress,
        spatialTelegraphProgress,
        isSpatialTelegraphVisible: true,
        materializationProgress: 1,
        dissolutionProgress: stateProgress,
      });
    }

    cursorMs = cadenceEndMs;
  }

  const dissolveMs = timing.finishMs - REGISTER_MS;
  const dissolveEndMs = cursorMs + dissolveMs;

  if (elapsedMs < dissolveEndMs) {
    const stateProgress = (elapsedMs - cursorMs) / dissolveMs;
    const lastPassIndex = definitions.length - 1;
    return createSnapshot({
      profile,
      elapsedMs,
      durationMs,
      state: "dissolve",
      stateProgress,
      passIndex: lastPassIndex,
      passDefinition: definitions[lastPassIndex],
      passProgress: 1,
      bossCueProgress,
      spatialTelegraphProgress,
      materializationProgress: 1,
      dissolutionProgress: stateProgress,
    });
  }

  return createSnapshot({
    profile,
    elapsedMs,
    durationMs,
    state: "register",
    stateProgress: (elapsedMs - dissolveEndMs) / REGISTER_MS,
    bossCueProgress,
    spatialTelegraphProgress,
    dissolutionProgress: 1,
  });
}

interface SnapshotValues {
  readonly profile: WingProfile;
  readonly elapsedMs: number;
  readonly durationMs: number;
  readonly state: WingTimelineState;
  readonly stateProgress: number;
  readonly passIndex?: number | null;
  readonly passDefinition?: WingPassDefinition | null;
  readonly passProgress?: number;
  readonly currentPreview?: WingPassPreview | null;
  readonly nextPreview?: WingPassPreview | null;
  readonly bossCueProgress: number;
  readonly spatialTelegraphProgress: number;
  readonly isSpatialTelegraphVisible?: boolean;
  readonly materializationProgress?: number;
  readonly dissolutionProgress?: number;
  readonly isDamageActive?: boolean;
  readonly damageKey?: string | null;
}

function createSnapshot(values: SnapshotValues): WingTimelineSnapshot {
  return {
    profile: values.profile,
    elapsedMs: values.elapsedMs,
    durationMs: values.durationMs,
    state: values.state,
    stateProgress: clamp(values.stateProgress, 0, 1),
    passIndex: values.passIndex ?? null,
    passDefinition: values.passDefinition ?? null,
    passProgress: clamp(values.passProgress ?? 0, 0, 1),
    currentPreview: values.currentPreview ?? null,
    nextPreview: values.nextPreview ?? null,
    bossCueProgress: values.bossCueProgress,
    pageCueProgress: values.bossCueProgress,
    spatialTelegraphProgress: values.spatialTelegraphProgress,
    isSpatialTelegraphVisible: values.isSpatialTelegraphVisible ?? false,
    materializationProgress: clamp(values.materializationProgress ?? 0, 0, 1),
    dissolutionProgress: clamp(values.dissolutionProgress ?? 0, 0, 1),
    isDamageActive: values.isDamageActive ?? false,
    damageKey: values.damageKey ?? null,
  };
}

function createPreview(
  definitions: readonly WingPassDefinition[],
  passIndex: number,
  role: WingPassPreview["role"],
  isDamageActive: boolean,
  instanceId: string,
): WingPassPreview | null {
  const definition = definitions[passIndex];

  if (!definition) {
    return null;
  }

  return {
    role,
    passIndex,
    definition,
    isDamageActive,
    damageKey: isDamageActive ? createDamageKey(instanceId, passIndex) : null,
  };
}

function createPass(
  direction: WingPassDirection,
  slot: WingGapSlot,
  gapWidthInPlayerDiameters: number,
  diagonalAngleDeg = 0,
): WingPassDefinition {
  return Object.freeze({
    direction,
    slot,
    gapCenter: SLOT_CENTERS[slot],
    gapWidthInPlayerDiameters,
    diagonalAngleDeg,
  });
}

function freezePasses(passes: readonly WingPassDefinition[]): readonly WingPassDefinition[] {
  return Object.freeze([...passes]);
}

function createDamageKey(instanceId: string, passIndex: number): string {
  return `asa:${instanceId}:${passIndex}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
