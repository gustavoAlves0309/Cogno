import { describe, expect, it } from "vitest";

import {
  getPerspectiveDuration,
  getPerspectiveProfileLabel,
  getPerspectiveTimelineSnapshot,
  type PerspectiveFigureId,
  type PerspectiveProfile,
  type PerspectiveState,
} from "./leonardoPerspectiveTimeline";

interface BeatBoundaries {
  readonly figureId: PerspectiveFigureId;
  readonly windupStart: number;
  readonly activeStart: number;
  readonly dissipationStart: number;
  readonly end: number;
}

interface ProfileCase {
  readonly profile: PerspectiveProfile;
  readonly durationMs: number;
  readonly beats: readonly BeatBoundaries[];
}

const CASES: readonly ProfileCase[] = [
  {
    profile: "v1",
    durationMs: 3_400,
    beats: [
      { figureId: "A", windupStart: 0, activeStart: 2_500, dissipationStart: 3_150, end: 3_400 },
    ],
  },
  {
    profile: "v2",
    durationMs: 5_800,
    beats: [
      { figureId: "A", windupStart: 0, activeStart: 1_800, dissipationStart: 2_450, end: 2_700 },
      { figureId: "B", windupStart: 2_700, activeStart: 4_900, dissipationStart: 5_550, end: 5_800 },
    ],
  },
  {
    profile: "v3-intro",
    durationMs: 8_500,
    beats: [
      { figureId: "A", windupStart: 0, activeStart: 1_800, dissipationStart: 2_450, end: 2_700 },
      { figureId: "B", windupStart: 2_700, activeStart: 4_500, dissipationStart: 5_150, end: 5_400 },
      { figureId: "C", windupStart: 5_400, activeStart: 7_600, dissipationStart: 8_250, end: 8_500 },
    ],
  },
  {
    profile: "v3-mature",
    durationMs: 6_900,
    beats: [
      { figureId: "A", windupStart: 0, activeStart: 1_400, dissipationStart: 2_050, end: 2_300 },
      { figureId: "B", windupStart: 2_300, activeStart: 3_700, dissipationStart: 4_350, end: 4_600 },
      { figureId: "C", windupStart: 4_600, activeStart: 6_000, dissipationStart: 6_650, end: 6_900 },
    ],
  },
];

function expectSnapshot(
  profile: PerspectiveProfile,
  time: number,
  state: PerspectiveState,
  beatIndex: number | null,
  figureId: PerspectiveFigureId | null,
  isDamageActive: boolean,
): void {
  const snapshot = getPerspectiveTimelineSnapshot(profile, time, "attempt-7");

  expect(snapshot.state).toBe(state);
  expect(snapshot.beatIndex).toBe(beatIndex);
  expect(snapshot.figureId).toBe(figureId);
  expect(snapshot.isDamageActive).toBe(isDamageActive);
  expect(snapshot.damageKey !== null).toBe(isDamageActive);
}

describe("Janela de Perspectiva timeline", () => {
  it("matches every [start, end) boundary, including the preceding millisecond", () => {
    for (const { profile, durationMs, beats } of CASES) {
      beats.forEach((beat, beatIndex) => {
        expectSnapshot(profile, beat.windupStart, "windup", beatIndex, beat.figureId, false);
        expectSnapshot(profile, beat.activeStart - 1, "windup", beatIndex, beat.figureId, false);
        expectSnapshot(profile, beat.activeStart, "active", beatIndex, beat.figureId, true);
        expectSnapshot(profile, beat.dissipationStart - 1, "active", beatIndex, beat.figureId, true);
        expectSnapshot(
          profile,
          beat.dissipationStart,
          "dissipation",
          beatIndex,
          beat.figureId,
          false,
        );
        expectSnapshot(profile, beat.end - 1, "dissipation", beatIndex, beat.figureId, false);
      });

      expectSnapshot(profile, durationMs, "complete", null, null, false);
    }
  });

  it("reports the exact duration and A/B/C sequence of every profile", () => {
    for (const { profile, durationMs, beats } of CASES) {
      expect(getPerspectiveDuration(profile)).toBe(durationMs);
      expect(
        beats.map(({ windupStart }) =>
          getPerspectiveTimelineSnapshot(profile, windupStart, "a").figureId),
      ).toEqual(beats.map(({ figureId }) => figureId));
    }
  });

  it("exposes no corridor, ghost, or legacy state aliases", () => {
    const snapshot = getPerspectiveTimelineSnapshot("v3-intro", 2_300, "a");

    expect(snapshot).not.toHaveProperty("version");
    expect(snapshot).not.toHaveProperty("beat");
    expect(snapshot).not.toHaveProperty("corridorIndex");
    expect(snapshot).not.toHaveProperty("ghostBeat");
    expect(snapshot).not.toHaveProperty("ghostCorridorIndex");
    expect(["windup", "active", "dissipation", "complete"]).toContain(snapshot.state);
  });

  it("makes the guide fully readable in 180 ms of each windup", () => {
    for (const { profile, beats } of CASES) {
      for (const { windupStart } of beats) {
        expect(getPerspectiveTimelineSnapshot(profile, windupStart, "a").guideProgress).toBe(0);
        expect(getPerspectiveTimelineSnapshot(profile, windupStart + 179, "a").guideProgress).toBeLessThan(1);
        expect(getPerspectiveTimelineSnapshot(profile, windupStart + 180, "a").guideProgress).toBe(1);
      }
    }
  });

  it("closes the perimeter exactly when damage becomes active", () => {
    for (const { profile, beats } of CASES) {
      for (const { activeStart } of beats) {
        const open = getPerspectiveTimelineSnapshot(profile, activeStart - 1, "a");
        const closed = getPerspectiveTimelineSnapshot(profile, activeStart, "a");

        expect(open.perimeterProgress).toBeLessThan(1);
        expect(open.isDamageActive).toBe(false);
        expect(closed.perimeterProgress).toBe(1);
        expect(closed.isDamageActive).toBe(true);
      }
    }
  });

  it("starts closing progress only in the final 200 ms of windup", () => {
    for (const { profile, beats } of CASES) {
      for (const { activeStart } of beats) {
        expect(getPerspectiveTimelineSnapshot(profile, activeStart - 201, "a").closingProgress).toBe(0);
        expect(getPerspectiveTimelineSnapshot(profile, activeStart - 200, "a").closingProgress).toBe(0);
        expect(getPerspectiveTimelineSnapshot(profile, activeStart - 100, "a").closingProgress).toBe(0.5);
        expect(getPerspectiveTimelineSnapshot(profile, activeStart - 1, "a").closingProgress).toBeCloseTo(0.995);
        expect(getPerspectiveTimelineSnapshot(profile, activeStart, "a").closingProgress).toBe(1);
      }
    }
  });

  it("decelerates the drawing head throughout the final 200 ms", () => {
    for (const { profile, beats } of CASES) {
      for (const { activeStart } of beats) {
        const samples = [200, 150, 100, 50, 0].map((remaining) =>
          getPerspectiveTimelineSnapshot(profile, activeStart - remaining, "a").perimeterProgress);
        const advances = samples.slice(1).map((sample, index) => sample - samples[index]);

        expect(advances[0]).toBeGreaterThan(advances[1]);
        expect(advances[1]).toBeGreaterThan(advances[2]);
        expect(advances[2]).toBeGreaterThan(advances[3]);
        expect(samples[4]).toBe(1);
      }
    }
  });

  it("uses 650 ms active and 250 ms dissipation for every beat", () => {
    for (const { beats } of CASES) {
      for (const { activeStart, dissipationStart, end } of beats) {
        expect(dissipationStart - activeStart).toBe(650);
        expect(end - dissipationStart).toBe(250);
      }
    }
  });

  it("uses [1800, 1800, 2200] windups for V3 intro and [1400, 1400, 1400] for mature", () => {
    const intro = CASES.find(({ profile }) => profile === "v3-intro")!;
    const mature = CASES.find(({ profile }) => profile === "v3-mature")!;

    expect(intro.beats.map(({ figureId }) => figureId)).toEqual(["A", "B", "C"]);
    expect(mature.beats.map(({ figureId }) => figureId)).toEqual(["A", "B", "C"]);
    expect(intro.beats.map((beat) => beat.activeStart - beat.windupStart)).toEqual([
      1_800, 1_800, 2_200,
    ]);
    expect(mature.beats.map((beat) => beat.activeStart - beat.windupStart)).toEqual([
      1_400, 1_400, 1_400,
    ]);
  });

  it("keeps a damage key stable within a beat and changes it between beats", () => {
    const firstStart = getPerspectiveTimelineSnapshot("v3-mature", 1_400, "attempt-7");
    const firstEnd = getPerspectiveTimelineSnapshot("v3-mature", 2_049, "attempt-7");
    const second = getPerspectiveTimelineSnapshot("v3-mature", 3_700, "attempt-7");

    expect(firstStart.damageKey).toBe("ponto:attempt-7:0");
    expect(firstEnd.damageKey).toBe(firstStart.damageKey);
    expect(second.damageKey).toBe("ponto:attempt-7:1");
    expect(second.damageKey).not.toBe(firstStart.damageKey);
  });

  it("clamps negative time and completes at each exact duration", () => {
    for (const { profile, durationMs } of CASES) {
      const start = getPerspectiveTimelineSnapshot(profile, -50, "a");
      const complete = getPerspectiveTimelineSnapshot(profile, durationMs, "a");

      expect(start.elapsedMs).toBe(0);
      expect(start.state).toBe("windup");
      expect(complete.elapsedMs).toBe(durationMs);
      expect(complete.state).toBe("complete");
      expect(complete.stateProgress).toBe(1);
    }
  });

  it("provides the canonical Lab label for each profile", () => {
    expect(getPerspectiveProfileLabel("v1")).toBe("Ponto V1");
    expect(getPerspectiveProfileLabel("v2")).toBe("Ponto V2");
    expect(getPerspectiveProfileLabel("v3-intro")).toBe("Ponto V3 — estreia");
    expect(getPerspectiveProfileLabel("v3-mature")).toBe("Ponto V3 — madura");
  });
});
