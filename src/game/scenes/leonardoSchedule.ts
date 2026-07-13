import {
  getPerspectiveDuration,
  type PerspectiveProfile,
} from "../mechanics/leonardoPerspectiveTimeline";
import {
  getWingDuration,
  type WingProfile,
} from "../mechanics/leonardoWingTimeline";

export type LeonardoPhaseId = "phase1" | "phase2" | "phase3" | "ultimate";
export type LeonardoAttackId = "ponto" | "asa" | "ponte" | "carro" | "valvula" | "sfumato";
export type LeonardoVersion = 1 | 2 | 3;

export type LeonardoAttackScriptEntry =
  | { id: "ponto"; profile: PerspectiveProfile }
  | { id: "asa"; profile: WingProfile }
  | { id: Exclude<LeonardoAttackId, "ponto" | "asa">; version: LeonardoVersion };

export interface LeonardoPhaseDefinition {
  id: LeonardoPhaseId;
  title: string;
  subtitle: string;
  duration: number;
  visualStage: 0 | 1 | 2 | 3;
}

export interface LeonardoAttackScriptEvent {
  kind: "attack";
  at: number;
  attacks: readonly LeonardoAttackScriptEntry[];
  replaceExisting: boolean;
  label: string;
}

export interface LeonardoRevisionScriptEvent {
  kind: "revision";
  at: number;
  label: string;
}

export interface LeonardoOpeningScriptEvent {
  kind: "opening";
  at: number;
  label: string;
}

export type LeonardoScriptEventDefinition =
  | LeonardoAttackScriptEvent
  | LeonardoRevisionScriptEvent
  | LeonardoOpeningScriptEvent;

export const LEONARDO_PHASE_DURATION_MS = 90_000;
export const LEONARDO_ULTIMATE_DURATION_MS = 75_000;
export const LEONARDO_PHASES: readonly LeonardoPhaseDefinition[] = [
  {
    id: "phase1",
    title: "Phase I",
    subtitle: "Geometria do voo",
    duration: LEONARDO_PHASE_DURATION_MS,
    visualStage: 0,
  },
  {
    id: "phase2",
    title: "Phase II",
    subtitle: "Máquinas e passagem",
    duration: LEONARDO_PHASE_DURATION_MS,
    visualStage: 1,
  },
  {
    id: "phase3",
    title: "Phase III",
    subtitle: "Corpo e percepção",
    duration: LEONARDO_PHASE_DURATION_MS,
    visualStage: 2,
  },
  {
    id: "ultimate",
    title: "Ultimate",
    subtitle: "Dilúvio do Codex",
    duration: LEONARDO_ULTIMATE_DURATION_MS,
    visualStage: 3,
  },
] as const;

const NORMAL_WINDOWS = [
  { at: 0, revisionAt: 13_000, primary: true, version: 1 as const },
  { at: 15_000, revisionAt: 28_000, primary: false, version: 1 as const },
  { at: 30_000, revisionAt: 43_000, primary: true, version: 2 as const },
  { at: 45_000, revisionAt: 58_000, primary: false, version: 2 as const },
  { at: 60_000, revisionAt: 74_000, primary: true, version: 3 as const },
  { at: 76_000, revisionAt: null, primary: false, version: 3 as const },
] as const;

const NORMAL_STUDIES: Record<Exclude<LeonardoPhaseId, "ultimate">, readonly [LeonardoAttackId, LeonardoAttackId]> = {
  phase1: ["ponto", "asa"],
  phase2: ["ponte", "carro"],
  phase3: ["valvula", "sfumato"],
};

const PERSPECTIVE_PROFILE_ORDER: Readonly<Record<PerspectiveProfile, number>> = {
  v1: 0,
  v2: 1,
  "v3-intro": 2,
  "v3-mature": 3,
};

const WING_PROFILE_ORDER: Readonly<Record<WingProfile, number>> = {
  v1: 0,
  v2: 1,
  "v3-intro": 2,
  "v3-mature": 3,
};

function isPerspectiveProfile(value: unknown): value is PerspectiveProfile {
  return typeof value === "string" && Object.hasOwn(PERSPECTIVE_PROFILE_ORDER, value);
}

function isWingProfile(value: unknown): value is WingProfile {
  return typeof value === "string" && Object.hasOwn(WING_PROFILE_ORDER, value);
}

function getPhaseOnePerspectiveProfile(version: LeonardoVersion): PerspectiveProfile {
  if (version === 1) {
    return "v1";
  }
  if (version === 2) {
    return "v2";
  }
  return "v3-intro";
}

function getPhaseOneWingProfile(version: LeonardoVersion): WingProfile {
  if (version === 1) {
    return "v1";
  }
  if (version === 2) {
    return "v2";
  }
  return "v3-intro";
}

export function getLeonardoPhase(id: LeonardoPhaseId): LeonardoPhaseDefinition {
  const phase = LEONARDO_PHASES.find((candidate) => candidate.id === id);
  if (!phase) {
    throw new Error(`Unknown Leonardo phase: ${id}`);
  }
  return phase;
}

export function getLeonardoPhaseForElapsed(elapsed: number): LeonardoPhaseDefinition {
  if (elapsed >= LEONARDO_PHASE_DURATION_MS * 3) {
    return getLeonardoPhase("ultimate");
  }
  if (elapsed >= LEONARDO_PHASE_DURATION_MS * 2) {
    return getLeonardoPhase("phase3");
  }
  if (elapsed >= LEONARDO_PHASE_DURATION_MS) {
    return getLeonardoPhase("phase2");
  }
  return getLeonardoPhase("phase1");
}

export function getLeonardoFightDuration(): number {
  return LEONARDO_PHASE_DURATION_MS * 3 + LEONARDO_ULTIMATE_DURATION_MS;
}

export function createLeonardoPhaseSchedule(phaseId: LeonardoPhaseId): LeonardoScriptEventDefinition[] {
  const phase = getLeonardoPhase(phaseId);
  const events = phaseId === "ultimate"
    ? createUltimateSchedule()
    : createNormalSchedule(phaseId);

  validateLeonardoSchedule(phase, events);
  return events;
}

export function createLeonardoFightSchedule(): LeonardoScriptEventDefinition[] {
  const offsets: Record<LeonardoPhaseId, number> = {
    phase1: 0,
    phase2: LEONARDO_PHASE_DURATION_MS,
    phase3: LEONARDO_PHASE_DURATION_MS * 2,
    ultimate: LEONARDO_PHASE_DURATION_MS * 3,
  };

  return LEONARDO_PHASES.flatMap((phase) => createLeonardoPhaseSchedule(phase.id).map((event) => ({
    ...event,
    at: event.at + offsets[phase.id],
  })));
}

export function validateLeonardoSchedule(
  phase: LeonardoPhaseDefinition,
  events: readonly LeonardoScriptEventDefinition[],
): void {
  let previousAt = -1;
  let activePerspectiveEnd = Number.NEGATIVE_INFINITY;
  let activeWingEnd = Number.NEGATIVE_INFINITY;
  let previousPerspectiveRank = -1;
  let previousWingRank = -1;
  const perspectiveProfiles: PerspectiveProfile[] = [];
  const wingProfiles: WingProfile[] = [];

  for (const event of events) {
    if (event.at < 0 || event.at >= phase.duration || event.at < previousAt) {
      throw new Error(`Invalid Leonardo schedule timing for ${phase.id}.`);
    }
    previousAt = event.at;

    if (event.kind === "attack") {
      if (typeof event.replaceExisting !== "boolean") {
        throw new Error(`Leonardo attack cleanup policy is missing for ${phase.id}.`);
      }
      if (event.attacks.length < 1 || event.attacks.length > 2) {
        throw new Error(`Invalid Leonardo attack count for ${phase.id}.`);
      }
      if (event.replaceExisting && event.at < activePerspectiveEnd) {
        throw new Error(`Leonardo attack would cut an active Ponto in ${phase.id}.`);
      }
      if (event.replaceExisting && event.at < activeWingEnd) {
        throw new Error(`Leonardo attack would cut an active Asa in ${phase.id}.`);
      }

      for (const attack of event.attacks) {
        const rawAttack = attack as unknown as Record<string, unknown>;
        if (attack.id === "ponto") {
          const profile = rawAttack.profile;
          if (!isPerspectiveProfile(profile) || Object.hasOwn(rawAttack, "version")) {
            throw new Error("Invalid Ponto profile in Leonardo schedule.");
          }
          if (event.at < activePerspectiveEnd) {
            throw new Error(`Ponto overlap in Leonardo ${phase.id}.`);
          }

          const rank = PERSPECTIVE_PROFILE_ORDER[profile];
          if (rank < previousPerspectiveRank) {
            throw new Error(`Invalid Ponto profile progression in Leonardo ${phase.id}.`);
          }
          previousPerspectiveRank = rank;
          perspectiveProfiles.push(profile);
          activePerspectiveEnd = event.at + getPerspectiveDuration(profile);
          continue;
        }

        if (attack.id === "asa") {
          const profile = rawAttack.profile;
          if (!isWingProfile(profile) || Object.hasOwn(rawAttack, "version")) {
            throw new Error("Invalid Asa profile in Leonardo schedule.");
          }
          if (event.at < activeWingEnd) {
            throw new Error(`Asa overlap in Leonardo ${phase.id}.`);
          }

          const rank = WING_PROFILE_ORDER[profile];
          if (rank < previousWingRank) {
            throw new Error(`Invalid Asa profile progression in Leonardo ${phase.id}.`);
          }
          previousWingRank = rank;
          wingProfiles.push(profile);
          activeWingEnd = event.at + getWingDuration(profile);
          continue;
        }

        const version = rawAttack.version;
        if (
          Object.hasOwn(rawAttack, "profile")
          || (version !== 1 && version !== 2 && version !== 3)
        ) {
          throw new Error(`Invalid Leonardo version for ${attack.id}.`);
        }
      }
      if (phase.id !== "ultimate" && event.attacks.length !== 1) {
        throw new Error(`Normal Leonardo phases cannot overlap studies.`);
      }
    } else {
      if (event.at < activePerspectiveEnd) {
        throw new Error(`Leonardo ${event.kind} would cut an active Ponto in ${phase.id}.`);
      }
      if (event.at < activeWingEnd) {
        throw new Error(`Leonardo ${event.kind} would cut an active Asa in ${phase.id}.`);
      }
    }
  }

  if (phase.id !== "ultimate") {
    const attacks = events.filter((event): event is LeonardoAttackScriptEvent => event.kind === "attack");
    const revisions = events.filter((event): event is LeonardoRevisionScriptEvent => event.kind === "revision");
    const hasEveryWindowStart = NORMAL_WINDOWS.every((window) => attacks.some((event) => event.at === window.at));
    if (!hasEveryWindowStart || revisions.length !== 5 || attacks[0]?.at !== 0) {
      throw new Error(`Leonardo normal phase cadence is incomplete for ${phase.id}.`);
    }
    const expectedProfiles: readonly PerspectiveProfile[] = phase.id === "phase1"
      ? ["v1", "v2", "v3-intro"]
      : [];
    if (
      perspectiveProfiles.length !== expectedProfiles.length
      || perspectiveProfiles.some((profile, index) => profile !== expectedProfiles[index])
    ) {
      throw new Error(`Leonardo Ponto profile progression is incomplete for ${phase.id}.`);
    }
    const expectedWingProfiles: readonly WingProfile[] = phase.id === "phase1"
      ? ["v1", "v2", "v3-intro"]
      : [];
    if (
      wingProfiles.length !== expectedWingProfiles.length
      || wingProfiles.some((profile, index) => profile !== expectedWingProfiles[index])
    ) {
      throw new Error(`Leonardo Asa profile progression is incomplete for ${phase.id}.`);
    }
    return;
  }

  if (
    perspectiveProfiles.length !== 2
    || perspectiveProfiles.some((profile) => profile !== "v3-mature")
  ) {
    throw new Error("Leonardo Ultimate Ponto progression must remain mature.");
  }

  if (wingProfiles.length !== 0) {
    throw new Error("Leonardo Ultimate Asa combinations remain quarantined.");
  }

  const expectedUltimateTimes = [0, 8_000, 17_000, 26_000, 30_000, 40_000, 48_000, 52_000, 57_000, 62_000, 67_000];
  if (events.length !== expectedUltimateTimes.length || events.some((event, index) => event.at !== expectedUltimateTimes[index])) {
    throw new Error("Leonardo Ultimate cadence is incomplete.");
  }
}

function createNormalSchedule(phaseId: Exclude<LeonardoPhaseId, "ultimate">): LeonardoScriptEventDefinition[] {
  const [primary, companion] = NORMAL_STUDIES[phaseId];
  const events: LeonardoScriptEventDefinition[] = [];

  for (const window of NORMAL_WINDOWS) {
    const id = window.primary ? primary : companion;
    const attack: LeonardoAttackScriptEntry = id === "ponto"
      ? { id, profile: getPhaseOnePerspectiveProfile(window.version) }
      : id === "asa"
        ? { id, profile: getPhaseOneWingProfile(window.version) }
        : { id, version: window.version };
    events.push({
      kind: "attack",
      at: window.at,
      attacks: [attack],
      replaceExisting: true,
      label: `${id} V${window.version}`,
    });
    if (phaseId === "phase3" && id !== "ponto" && id !== "asa") {
      const windowEnd = window.revisionAt ?? LEONARDO_PHASE_DURATION_MS;
      const repeatOffsets = [4_800, 9_600];
      for (const offset of repeatOffsets) {
        const repeatAt = window.at + offset;
        if (repeatAt < windowEnd - 700) {
          events.push({
            kind: "attack",
            at: repeatAt,
            attacks: [{ id, version: window.version }],
            replaceExisting: true,
            label: `${id} V${window.version} — repetição`,
          });
        }
      }
    }
    if (window.revisionAt !== null) {
      events.push({
        kind: "revision",
        at: window.revisionAt,
        label: "Correção em carvão",
      });
    }
  }

  return events;
}

function createUltimateSchedule(): LeonardoScriptEventDefinition[] {
  return [
    { kind: "opening", at: 0, label: "Ruptura do Codex" },
    { kind: "attack", at: 8_000, attacks: [{ id: "ponto", profile: "v3-mature" }], replaceExisting: false, label: "Perspectiva madura" },
    { kind: "attack", at: 17_000, attacks: [{ id: "ponto", profile: "v3-mature" }], replaceExisting: false, label: "Perspectiva madura" },
    { kind: "revision", at: 26_000, label: "Correção do Codex" },
    { kind: "attack", at: 30_000, attacks: [{ id: "ponte", version: 2 }, { id: "carro", version: 2 }], replaceExisting: false, label: "Passagem e máquina" },
    { kind: "attack", at: 40_000, attacks: [{ id: "ponte", version: 2 }, { id: "carro", version: 2 }], replaceExisting: false, label: "Passagem e máquina" },
    { kind: "revision", at: 48_000, label: "Correção do Codex" },
    { kind: "attack", at: 52_000, attacks: [{ id: "valvula", version: 3 }, { id: "sfumato", version: 2 }], replaceExisting: false, label: "Ritmo e luz" },
    { kind: "attack", at: 57_000, attacks: [{ id: "valvula", version: 3 }, { id: "sfumato", version: 2 }], replaceExisting: false, label: "Ritmo e luz" },
    { kind: "attack", at: 62_000, attacks: [{ id: "valvula", version: 3 }, { id: "sfumato", version: 2 }], replaceExisting: false, label: "Ritmo e luz" },
    { kind: "attack", at: 67_000, attacks: [{ id: "valvula", version: 3 }, { id: "sfumato", version: 2 }], replaceExisting: false, label: "Avaliação final" },
  ];
}
