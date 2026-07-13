export const GAME_PROGRESSION_STORAGE_KEY = "cogno.game-progression.v1";
export const GAME_PROGRESSION_VERSION = 1 as const;

export type BossId = "cleopatra" | "leonardo" | "genghis";
export type BossSceneKey = "CleopatraScene" | "LeonardoScene";

export interface BossDefinition {
  id: BossId;
  name: string;
  sceneKey: BossSceneKey | null;
}

export interface GameProgressionProfile {
  version: typeof GAME_PROGRESSION_VERSION;
  devMode: boolean;
  completedBosses: BossId[];
}

export const BOSS_DEFINITIONS: readonly BossDefinition[] = [
  { id: "cleopatra", name: "Cleópatra", sceneKey: "CleopatraScene" },
  { id: "leonardo", name: "Leonardo da Vinci", sceneKey: "LeonardoScene" },
  { id: "genghis", name: "Genghis Khan", sceneKey: null },
];

let inMemoryProfile = createDefaultProfile();
let storageFailed = false;

export function createDefaultProfile(): GameProgressionProfile {
  return {
    version: GAME_PROGRESSION_VERSION,
    devMode: false,
    completedBosses: [],
  };
}

export function readGameProgression(): GameProgressionProfile {
  const storage = getStorage();
  if (!storage) {
    return cloneProfile(inMemoryProfile);
  }

  try {
    const storedValue = storage.getItem(GAME_PROGRESSION_STORAGE_KEY);
    if (storedValue === null) {
      inMemoryProfile = createDefaultProfile();
      return cloneProfile(inMemoryProfile);
    }

    const parsedProfile = parseProfile(storedValue);
    if (!parsedProfile) {
      inMemoryProfile = createDefaultProfile();
      writeProfile(inMemoryProfile, storage);
      return cloneProfile(inMemoryProfile);
    }

    inMemoryProfile = parsedProfile;
    return cloneProfile(inMemoryProfile);
  } catch {
    enterStorageFallback();
    return cloneProfile(inMemoryProfile);
  }
}

export function setDevMode(enabled: boolean): GameProgressionProfile {
  const profile = readGameProgression();
  const nextProfile: GameProgressionProfile = {
    ...profile,
    devMode: enabled,
  };

  return saveProfile(nextProfile);
}

export function toggleDevMode(): GameProgressionProfile {
  return setDevMode(!readGameProgression().devMode);
}

export function getBossDefinition(bossId: BossId): BossDefinition {
  const definition = BOSS_DEFINITIONS.find((boss) => boss.id === bossId);
  if (!definition) {
    throw new Error(`Unknown boss: ${bossId}`);
  }
  return definition;
}

export function isBossImplemented(bossId: BossId): boolean {
  return getBossDefinition(bossId).sceneKey !== null;
}

export function isBossSelectable(
  bossId: BossId,
  profile: GameProgressionProfile = readGameProgression(),
): boolean {
  const bossIndex = BOSS_DEFINITIONS.findIndex((boss) => boss.id === bossId);
  if (bossIndex < 0 || !isBossImplemented(bossId)) {
    return false;
  }

  if (profile.devMode || bossIndex === 0) {
    return true;
  }

  const predecessor = BOSS_DEFINITIONS[bossIndex - 1];
  return predecessor !== undefined && profile.completedBosses.includes(predecessor.id);
}

export function recordNormalVictory(bossId: BossId): GameProgressionProfile {
  const profile = readGameProgression();
  if (
    profile.devMode ||
    !isBossImplemented(bossId) ||
    !isBossSelectable(bossId, { ...profile, devMode: false }) ||
    profile.completedBosses.includes(bossId)
  ) {
    return profile;
  }

  return saveProfile({
    ...profile,
    completedBosses: [...profile.completedBosses, bossId],
  });
}

export function isLabAvailable(
  bossId: BossId,
  profile: GameProgressionProfile = readGameProgression(),
): boolean {
  return profile.devMode && isBossSelectable(bossId, profile);
}

function saveProfile(profile: GameProgressionProfile): GameProgressionProfile {
  inMemoryProfile = cloneProfile(profile);
  const storage = getStorage();
  if (storage) {
    writeProfile(inMemoryProfile, storage);
  }
  return cloneProfile(inMemoryProfile);
}

function writeProfile(profile: GameProgressionProfile, storage: Storage): void {
  try {
    storage.setItem(GAME_PROGRESSION_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    enterStorageFallback();
  }
}

function getStorage(): Storage | null {
  if (storageFailed || typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    enterStorageFallback();
    return null;
  }
}

function enterStorageFallback(): void {
  storageFailed = true;
  inMemoryProfile = createDefaultProfile();
}

function parseProfile(value: string): GameProgressionProfile | null {
  try {
    const candidate: unknown = JSON.parse(value);
    if (!isRecord(candidate)) {
      return null;
    }

    const { version, devMode, completedBosses } = candidate;
    if (
      version !== GAME_PROGRESSION_VERSION ||
      typeof devMode !== "boolean" ||
      !Array.isArray(completedBosses) ||
      !completedBosses.every(isBossId) ||
      new Set(completedBosses).size !== completedBosses.length
    ) {
      return null;
    }

    return {
      version: GAME_PROGRESSION_VERSION,
      devMode,
      completedBosses: [...completedBosses],
    };
  } catch {
    return null;
  }
}

function isBossId(value: unknown): value is BossId {
  return typeof value === "string" && BOSS_DEFINITIONS.some((boss) => boss.id === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneProfile(profile: GameProgressionProfile): GameProgressionProfile {
  return {
    version: GAME_PROGRESSION_VERSION,
    devMode: profile.devMode,
    completedBosses: [...profile.completedBosses],
  };
}
