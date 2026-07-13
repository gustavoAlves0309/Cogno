import { describe, expect, it } from "vitest";

import { getPerspectiveDuration } from "../mechanics/leonardoPerspectiveTimeline";
import { getWingDuration } from "../mechanics/leonardoWingTimeline";
import {
  createLeonardoFightSchedule,
  createLeonardoPhaseSchedule,
  getLeonardoPhase,
  validateLeonardoSchedule,
  type LeonardoAttackScriptEntry,
  type LeonardoAttackScriptEvent,
  type LeonardoScriptEventDefinition,
} from "./leonardoSchedule";

function getAttackEvents(
  events: readonly LeonardoScriptEventDefinition[],
): LeonardoAttackScriptEvent[] {
  return events.filter((event): event is LeonardoAttackScriptEvent => event.kind === "attack");
}

function getPointCasts(events: readonly LeonardoScriptEventDefinition[]) {
  return getAttackEvents(events).flatMap((event) => event.attacks
    .filter((attack): attack is Extract<LeonardoAttackScriptEntry, { id: "ponto" }> => attack.id === "ponto")
    .map((attack) => ({ at: event.at, profile: attack.profile })));
}

function getWingCasts(events: readonly LeonardoScriptEventDefinition[]) {
  return getAttackEvents(events).flatMap((event) => event.attacks
    .filter((attack): attack is Extract<LeonardoAttackScriptEntry, { id: "asa" }> => attack.id === "asa")
    .map((attack) => ({
      at: event.at,
      end: event.at + getWingDuration(attack.profile),
      profile: attack.profile,
      replaceExisting: event.replaceExisting,
    })));
}

function describeVersionedAttacks(events: readonly LeonardoScriptEventDefinition[]) {
  return getAttackEvents(events).flatMap((event) => event.attacks
    .filter((attack): attack is Extract<LeonardoAttackScriptEntry, { version: 1 | 2 | 3 }> => "version" in attack)
    .map((attack) => [event.at, attack.id, attack.version] as const));
}

describe("Leonardo schedule", () => {
  it("declares the real-fight Ponto progression explicitly and resets it on retry", () => {
    const expected = [
      { at: 0, profile: "v1" },
      { at: 30_000, profile: "v2" },
      { at: 60_000, profile: "v3-intro" },
      { at: 278_000, profile: "v3-mature" },
      { at: 287_000, profile: "v3-mature" },
    ];

    expect(getPointCasts(createLeonardoFightSchedule())).toEqual(expected);
    expect(getPointCasts(createLeonardoFightSchedule())).toEqual(expected);
  });

  it("uses the discriminated entry shape and an explicit cleanup policy", () => {
    for (const event of getAttackEvents(createLeonardoFightSchedule())) {
      expect(Object.hasOwn(event, "replaceExisting")).toBe(true);
      expect(typeof event.replaceExisting).toBe("boolean");

      for (const attack of event.attacks) {
        if (attack.id === "ponto" || attack.id === "asa") {
          expect(Object.hasOwn(attack, "profile")).toBe(true);
          expect(Object.hasOwn(attack, "version")).toBe(false);
        } else {
          expect(Object.hasOwn(attack, "version")).toBe(true);
          expect(Object.hasOwn(attack, "profile")).toBe(false);
        }
      }
    }
  });

  it("quarantines every legacy Ultimate wing combination without changing the remaining script", () => {
    const ultimate = createLeonardoPhaseSchedule("ultimate");
    const pointCasts = getPointCasts(ultimate);

    expect(pointCasts).toEqual([
      { at: 8_000, profile: "v3-mature" },
      { at: 17_000, profile: "v3-mature" },
    ]);
    expect(pointCasts.map((cast) => cast.at + getPerspectiveDuration(cast.profile))).toEqual([
      14_900, 23_900,
    ]);
    expect(getWingCasts(ultimate)).toEqual([]);
    expect(ultimate.map((event) => event.at)).toEqual([
      0, 8_000, 17_000, 26_000, 30_000, 40_000,
      48_000, 52_000, 57_000, 62_000, 67_000,
    ]);
    expect(describeVersionedAttacks(ultimate)).toEqual([
      [30_000, "ponte", 2], [30_000, "carro", 2],
      [40_000, "ponte", 2], [40_000, "carro", 2],
      [52_000, "valvula", 3], [52_000, "sfumato", 2],
      [57_000, "valvula", 3], [57_000, "sfumato", 2],
      [62_000, "valvula", 3], [62_000, "sfumato", 2],
      [67_000, "valvula", 3], [67_000, "sfumato", 2],
    ]);
    expect(ultimate.some((event) => event.kind === "revision" && event.at === 26_000)).toBe(true);
  });

  it("maps the three Phase I wing casts without legacy internal repeats", () => {
    const phaseOne = createLeonardoPhaseSchedule("phase1");

    expect(getWingCasts(phaseOne)).toEqual([
      { at: 15_000, end: 22_000, profile: "v1", replaceExisting: true },
      { at: 45_000, end: 53_000, profile: "v2", replaceExisting: true },
      { at: 76_000, end: 83_000, profile: "v3-intro", replaceExisting: true },
    ]);
    expect(getAttackEvents(phaseOne).map((event) => event.at)).toEqual([
      0, 15_000, 30_000, 45_000, 60_000, 76_000,
    ]);
    expect(getAttackEvents(phaseOne).every((event) => event.replaceExisting)).toBe(true);
  });

  it("never overlaps or clears a running Ponto cast", () => {
    const events = createLeonardoFightSchedule();
    const points = getPointCasts(events);

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      const end = point.at + getPerspectiveDuration(point.profile);
      const nextPoint = points[index + 1];
      if (nextPoint) {
        expect(nextPoint.at).toBeGreaterThanOrEqual(end);
      }

      const eventsDuringCast = events.filter((event) => event.at > point.at && event.at < end);
      expect(eventsDuringCast.every((event) =>
        event.kind === "attack" && event.replaceExisting === false)).toBe(true);
    }

    for (const wing of getWingCasts(events)) {
      const eventsDuringCast = events.filter((event) => event.at > wing.at && event.at < wing.end);
      expect(eventsDuringCast).toEqual([]);
    }
  });

  it("rejects both a 900 ms mature overlap and substitutive cleanup", () => {
    const phase = getLeonardoPhase("ultimate");
    const schedule = createLeonardoPhaseSchedule("ultimate");
    const firstCast = getPointCasts(schedule)[0];
    const overlappingSecondStart = 14_000;
    const overlapping = schedule.map((event) =>
      event.kind === "attack" && getPointCasts([event]).some((cast) => cast.at === 17_000)
        ? { ...event, at: overlappingSecondStart }
        : event);
    const cutting = schedule.flatMap((event): LeonardoScriptEventDefinition[] =>
      event.kind === "attack" && event.at === 8_000
        ? [event, {
            kind: "attack",
            at: overlappingSecondStart,
            attacks: [{ id: "ponte", version: 1 }],
            replaceExisting: true,
            label: "Unsafe Ponto cleanup",
          }]
        : [event]);

    expect(firstCast.at + getPerspectiveDuration(firstCast.profile) - overlappingSecondStart).toBe(900);
    expect(() => validateLeonardoSchedule(phase, overlapping)).toThrow(/overlap/i);
    expect(() => validateLeonardoSchedule(phase, cutting)).toThrow(/cut/i);
  });

  it("rejects Wing auto-overlap and substitutive cleanup before getWingDuration completes", () => {
    const phase = getLeonardoPhase("phase1");
    const schedule = createLeonardoPhaseSchedule("phase1");
    const wing = getWingCasts(schedule).find((cast) => cast.profile === "v2");
    expect(wing).toBeDefined();

    const unsafeAt = wing!.end - 1_000;
    const insertAfterV2 = (event: LeonardoAttackScriptEvent): LeonardoScriptEventDefinition[] =>
      schedule.flatMap((candidate) =>
        candidate.kind === "attack" && candidate.at === wing!.at
          ? [candidate, event]
          : [candidate]);
    const overlapping = insertAfterV2({
      kind: "attack",
      at: unsafeAt,
      attacks: [{ id: "asa", profile: "v2" }],
      replaceExisting: false,
      label: "Unsafe Wing overlap",
    });
    const cutting = insertAfterV2({
      kind: "attack",
      at: unsafeAt,
      attacks: [{ id: "ponte", version: 1 }],
      replaceExisting: true,
      label: "Unsafe Wing cleanup",
    });

    expect(wing!.end - unsafeAt).toBe(1_000);
    expect(() => validateLeonardoSchedule(phase, overlapping)).toThrow(/Asa overlap/i);
    expect(() => validateLeonardoSchedule(phase, cutting)).toThrow(/cut.*Asa/i);
  });

  it("rejects invalid Wing profiles and the legacy version entry shape", () => {
    const phase = getLeonardoPhase("phase1");
    const replaceFirstWing = (attack: unknown) => createLeonardoPhaseSchedule("phase1").map((event) =>
      event.kind === "attack" && event.at === 15_000
        ? { ...event, attacks: [attack as LeonardoAttackScriptEntry] }
        : event);

    expect(() => validateLeonardoSchedule(phase, replaceFirstWing({ id: "asa", profile: "v4" })))
      .toThrow(/invalid Asa profile/i);
    expect(() => validateLeonardoSchedule(phase, replaceFirstWing({ id: "asa", version: 1 })))
      .toThrow(/invalid Asa profile/i);
  });

  it("rejects a return to an earlier Ponto profile", () => {
    const schedule = createLeonardoPhaseSchedule("phase1").map((event) =>
      event.kind === "attack" && event.at === 60_000
        ? {
            ...event,
            attacks: [{ id: "ponto", profile: "v1" }] as const,
          }
        : event);

    expect(() => validateLeonardoSchedule(getLeonardoPhase("phase1"), schedule)).toThrow(/progression/i);
  });

  it("keeps the Phase II and III attack scripts unchanged", () => {
    const phaseTwo = createLeonardoPhaseSchedule("phase2");
    const phaseThree = createLeonardoPhaseSchedule("phase3");

    expect(describeVersionedAttacks(phaseTwo)).toEqual([
      [0, "ponte", 1], [15_000, "carro", 1], [30_000, "ponte", 2],
      [45_000, "carro", 2], [60_000, "ponte", 3], [76_000, "carro", 3],
    ]);
    expect(describeVersionedAttacks(phaseThree)).toEqual([
      [0, "valvula", 1], [4_800, "valvula", 1], [9_600, "valvula", 1],
      [15_000, "sfumato", 1], [19_800, "sfumato", 1], [24_600, "sfumato", 1],
      [30_000, "valvula", 2], [34_800, "valvula", 2], [39_600, "valvula", 2],
      [45_000, "sfumato", 2], [49_800, "sfumato", 2], [54_600, "sfumato", 2],
      [60_000, "valvula", 3], [64_800, "valvula", 3], [69_600, "valvula", 3],
      [76_000, "sfumato", 3], [80_800, "sfumato", 3], [85_600, "sfumato", 3],
    ]);
    for (const events of [phaseTwo, phaseThree]) {
      expect(events.filter((event) => event.kind === "revision").map((event) => event.at)).toEqual([
        13_000, 28_000, 43_000, 58_000, 74_000,
      ]);
      expect(getAttackEvents(events).every((event) => event.replaceExisting)).toBe(true);
    }
  });
});
