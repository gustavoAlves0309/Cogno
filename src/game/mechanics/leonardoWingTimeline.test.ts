import { describe, expect, it } from "vitest";

import {
  WING_PASS_DEFINITIONS,
  getWingDuration,
  getWingPassDefinitions,
  getWingProfileLabel,
  getWingTimelineSnapshot,
  type WingPassDirection,
  type WingProfile,
  type WingTimelineState,
} from "./leonardoWingTimeline";

interface StateBoundary {
  readonly state: Exclude<WingTimelineState, "complete">;
  readonly start: number;
  readonly end: number;
  readonly passIndex: number | null;
}

interface ProfileCase {
  readonly profile: WingProfile;
  readonly durationMs: number;
  readonly cadenceMs: number;
  readonly directions: readonly WingPassDirection[];
  readonly slots: readonly ("left" | "right" | "center")[];
  readonly width: number;
  readonly boundaries: readonly StateBoundary[];
}

const CASES: readonly ProfileCase[] = [
  {
    profile: "v1",
    durationMs: 7_000,
    cadenceMs: 1_100,
    directions: ["down", "down"],
    slots: ["left", "right"],
    width: 3,
    boundaries: [
      { state: "windup", start: 0, end: 1_800, passIndex: 0 },
      { state: "active", start: 1_800, end: 3_200, passIndex: 0 },
      { state: "cadence", start: 3_200, end: 4_300, passIndex: 1 },
      { state: "active", start: 4_300, end: 5_700, passIndex: 1 },
      { state: "dissolve", start: 5_700, end: 6_700, passIndex: 1 },
      { state: "register", start: 6_700, end: 7_000, passIndex: null },
    ],
  },
  {
    profile: "v2",
    durationMs: 8_000,
    cadenceMs: 900,
    directions: ["down", "up", "down"],
    slots: ["left", "right", "center"],
    width: 2.5,
    boundaries: [
      { state: "windup", start: 0, end: 1_500, passIndex: 0 },
      { state: "active", start: 1_500, end: 2_650, passIndex: 0 },
      { state: "cadence", start: 2_650, end: 3_550, passIndex: 1 },
      { state: "active", start: 3_550, end: 4_700, passIndex: 1 },
      { state: "cadence", start: 4_700, end: 5_600, passIndex: 2 },
      { state: "active", start: 5_600, end: 6_750, passIndex: 2 },
      { state: "dissolve", start: 6_750, end: 7_700, passIndex: 2 },
      { state: "register", start: 7_700, end: 8_000, passIndex: null },
    ],
  },
  {
    profile: "v3-intro",
    durationMs: 7_000,
    cadenceMs: 700,
    directions: ["down", "up", "diagonal"],
    slots: ["left", "right", "center"],
    width: 2.2,
    boundaries: [
      { state: "windup", start: 0, end: 1_500, passIndex: 0 },
      { state: "active", start: 1_500, end: 2_500, passIndex: 0 },
      { state: "cadence", start: 2_500, end: 3_200, passIndex: 1 },
      { state: "active", start: 3_200, end: 4_200, passIndex: 1 },
      { state: "cadence", start: 4_200, end: 4_900, passIndex: 2 },
      { state: "active", start: 4_900, end: 5_900, passIndex: 2 },
      { state: "dissolve", start: 5_900, end: 6_700, passIndex: 2 },
      { state: "register", start: 6_700, end: 7_000, passIndex: null },
    ],
  },
  {
    profile: "v3-mature",
    durationMs: 6_450,
    cadenceMs: 700,
    directions: ["down", "up", "diagonal"],
    slots: ["left", "right", "center"],
    width: 2.2,
    boundaries: [
      { state: "windup", start: 0, end: 1_150, passIndex: 0 },
      { state: "active", start: 1_150, end: 2_150, passIndex: 0 },
      { state: "cadence", start: 2_150, end: 2_850, passIndex: 1 },
      { state: "active", start: 2_850, end: 3_850, passIndex: 1 },
      { state: "cadence", start: 3_850, end: 4_550, passIndex: 2 },
      { state: "active", start: 4_550, end: 5_550, passIndex: 2 },
      { state: "dissolve", start: 5_550, end: 6_150, passIndex: 2 },
      { state: "register", start: 6_150, end: 6_450, passIndex: null },
    ],
  },
];

describe("Asa em Estudo timeline", () => {
  it("exposes the four exact durations and canonical Lab labels", () => {
    expect(CASES.map(({ profile }) => getWingDuration(profile))).toEqual([
      7_000,
      8_000,
      7_000,
      6_450,
    ]);
    expect(CASES.map(({ profile }) => getWingProfileLabel(profile))).toEqual([
      "Asa V1",
      "Asa V2",
      "Asa V3 estreia",
      "Asa V3 madura",
    ]);
  });

  it("uses the approved immutable directions, slots, centers, widths, and diagonal", () => {
    for (const profileCase of CASES) {
      const passes = getWingPassDefinitions(profileCase.profile);

      expect(passes.map(({ direction }) => direction)).toEqual(profileCase.directions);
      expect(passes.map(({ slot }) => slot)).toEqual(profileCase.slots);
      expect(passes.map(({ gapCenter }) => gapCenter)).toEqual(
        profileCase.slots.map((slot) => ({ left: 0.25, right: 0.75, center: 0.5 })[slot]),
      );
      expect(passes.map(({ gapWidthInPlayerDiameters }) => gapWidthInPlayerDiameters)).toEqual(
        passes.map(() => profileCase.width),
      );
      expect(Object.isFrozen(passes)).toBe(true);
      expect(passes.every(Object.isFrozen)).toBe(true);
    }

    expect(getWingPassDefinitions("v3-intro")).toBe(getWingPassDefinitions("v3-mature"));
    expect(getWingPassDefinitions("v3-intro").map(({ diagonalAngleDeg }) => diagonalAngleDeg)).toEqual([
      0,
      0,
      20,
    ]);
    expect(Object.isFrozen(WING_PASS_DEFINITIONS)).toBe(true);
  });

  it("honors every [start, end) boundary and the exact 1100/900/700 ms cadences", () => {
    for (const profileCase of CASES) {
      for (const boundary of profileCase.boundaries) {
        const start = getWingTimelineSnapshot(profileCase.profile, boundary.start, "attempt");
        const lastMillisecond = getWingTimelineSnapshot(
          profileCase.profile,
          boundary.end - 1,
          "attempt",
        );

        expect(start.state).toBe(boundary.state);
        expect(start.stateProgress).toBe(0);
        expect(start.passIndex).toBe(boundary.passIndex);
        expect(lastMillisecond.state).toBe(boundary.state);
        expect(lastMillisecond.stateProgress).toBeLessThan(1);
      }

      const cadenceBoundaries = profileCase.boundaries.filter(({ state }) => state === "cadence");
      expect(cadenceBoundaries.every(({ start, end }) => end - start === profileCase.cadenceMs)).toBe(true);
      expect(getWingTimelineSnapshot(profileCase.profile, profileCase.durationMs, "attempt").state).toBe(
        "complete",
      );
    }
  });

  it("shows only the strong current route and the next ghost, promoting during cadence", () => {
    const firstActive = getWingTimelineSnapshot("v3-intro", 1_500, "attempt");
    expect(firstActive.currentPreview).toMatchObject({ role: "current", passIndex: 0 });
    expect(firstActive.nextPreview).toMatchObject({
      role: "next",
      passIndex: 1,
      isDamageActive: false,
      damageKey: null,
    });

    const firstCadence = getWingTimelineSnapshot("v3-intro", 2_500, "attempt");
    expect(firstCadence.currentPreview).toMatchObject({ role: "current", passIndex: 1 });
    expect(firstCadence.nextPreview).toMatchObject({ role: "next", passIndex: 2 });

    const finalActive = getWingTimelineSnapshot("v3-intro", 4_900, "attempt");
    expect(finalActive.currentPreview).toMatchObject({ role: "current", passIndex: 2 });
    expect(finalActive.nextPreview).toBeNull();
  });

  it("keeps ghosts harmless and gives each active passage one stable, distinct damage key", () => {
    const firstStart = getWingTimelineSnapshot("v3-mature", 1_150, "attempt-7");
    const firstEnd = getWingTimelineSnapshot("v3-mature", 2_149, "attempt-7");
    const cadence = getWingTimelineSnapshot("v3-mature", 2_150, "attempt-7");
    const second = getWingTimelineSnapshot("v3-mature", 2_850, "attempt-7");

    expect(firstStart.damageKey).toBe("asa:attempt-7:0");
    expect(firstStart.currentPreview?.damageKey).toBe(firstStart.damageKey);
    expect(firstStart.nextPreview?.damageKey).toBeNull();
    expect(firstEnd.damageKey).toBe(firstStart.damageKey);
    expect(cadence.damageKey).toBeNull();
    expect(cadence.currentPreview?.damageKey).toBeNull();
    expect(second.damageKey).toBe("asa:attempt-7:1");
    expect(second.damageKey).not.toBe(firstStart.damageKey);
  });

  it("uses a 650 ms mature boss/page cue and starts its 850 ms spatial telegraph at 300 ms", () => {
    const beforeSpatial = getWingTimelineSnapshot("v3-mature", 299, "attempt");
    const spatialStart = getWingTimelineSnapshot("v3-mature", 300, "attempt");
    const cueEnd = getWingTimelineSnapshot("v3-mature", 650, "attempt");
    const firstPass = getWingTimelineSnapshot("v3-mature", 1_150, "attempt");

    expect(beforeSpatial.isSpatialTelegraphVisible).toBe(false);
    expect(beforeSpatial.currentPreview).toBeNull();
    expect(spatialStart.isSpatialTelegraphVisible).toBe(true);
    expect(spatialStart.spatialTelegraphProgress).toBe(0);
    expect(spatialStart.currentPreview?.passIndex).toBe(0);
    expect(cueEnd.bossCueProgress).toBe(1);
    expect(cueEnd.pageCueProgress).toBe(1);
    expect(firstPass.spatialTelegraphProgress).toBe(1);
    expect(firstPass.elapsedMs - 300).toBe(850);
  });

  it("keeps V3 intro and mature geometry identical while changing only their initial timing", () => {
    expect(getWingPassDefinitions("v3-intro")).toBe(getWingPassDefinitions("v3-mature"));
    expect(getWingTimelineSnapshot("v3-intro", 1_149, "a").state).toBe("windup");
    expect(getWingTimelineSnapshot("v3-mature", 1_149, "a").state).toBe("windup");
    expect(getWingTimelineSnapshot("v3-mature", 1_150, "a").state).toBe("active");
    expect(getWingTimelineSnapshot("v3-intro", 1_150, "a").state).toBe("windup");
  });

  it("reports materialization and dissolution progress in their owning phases", () => {
    const activeMidpoint = getWingTimelineSnapshot("v1", 2_500, "a");
    const cadenceMidpoint = getWingTimelineSnapshot("v1", 3_750, "a");
    const dissolveMidpoint = getWingTimelineSnapshot("v1", 6_200, "a");
    const register = getWingTimelineSnapshot("v1", 6_700, "a");

    expect(activeMidpoint.materializationProgress).toBe(0.5);
    expect(activeMidpoint.dissolutionProgress).toBe(0);
    expect(cadenceMidpoint.materializationProgress).toBe(1);
    expect(cadenceMidpoint.dissolutionProgress).toBe(0.5);
    expect(dissolveMidpoint.materializationProgress).toBe(1);
    expect(dissolveMidpoint.dissolutionProgress).toBe(0.5);
    expect(register.dissolutionProgress).toBe(1);
  });

  it("clamps negative and non-finite time to zero and completes at each exact duration", () => {
    for (const { profile, durationMs } of CASES) {
      for (const ageMs of [-50, Number.NaN, Number.POSITIVE_INFINITY]) {
        const start = getWingTimelineSnapshot(profile, ageMs, "a");
        expect(start.elapsedMs).toBe(0);
        expect(start.state).toBe("windup");
      }

      const complete = getWingTimelineSnapshot(profile, durationMs, "a");
      expect(complete.elapsedMs).toBe(durationMs);
      expect(complete.state).toBe("complete");
      expect(complete.stateProgress).toBe(1);
      expect(complete.passIndex).toBeNull();
      expect(complete.currentPreview).toBeNull();
      expect(complete.nextPreview).toBeNull();
      expect(complete.damageKey).toBeNull();
    }
  });
});
