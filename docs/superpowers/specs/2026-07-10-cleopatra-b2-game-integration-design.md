# Cleopatra B2 Game Integration

## Goal

Replace the active Cleopatra soundtrack with the selected B2 composition by mapping each literal 15-second section of the demo to its corresponding fight state. Repetition within a state and transitions between states must not produce audible cuts.

## Section Mapping

| Fight state | B2 source section | Playback behavior |
| --- | --- | --- |
| Phase 1 | 0-15 seconds | Repeat for the full Phase 1 duration |
| Phase 2 | 15-30 seconds | Repeat for the full Phase 2 duration |
| Phase 3 | 30-45 seconds | Repeat for the full Phase 3 duration |
| Ultimate opening | 45-60 seconds | Repeat for the first 30 seconds of Ultimate |
| Ultimate finale | 60-75 seconds | Repeat from Cleopatra's entrance until the fight ends |

The musical content and orchestration of each source section remain intact. This work does not expand the sections into new 30-second arrangements.

## Loop Assets

- Extract five stereo, 16-bit PCM, 22050 Hz assets from the B2 demo.
- Keep every asset exactly 15 seconds long, or 330750 frames.
- Apply circular boundary treatment only where necessary to carry ambience and instrument tails across the loop point.
- Do not apply edge fades that create a volume dip once per repetition.
- Preserve the original B2 demo and all previous soundtrack assets.

## Playback Model

The current audio engine starts every phase track together and changes only their gains. That model can make a selected 15-second section enter at an arbitrary point. Replace it with active-track playback:

1. Start the selected phase asset at offset zero.
2. Keep it looping until the fight state changes.
3. On a state change, start the incoming asset at offset zero and crossfade from the outgoing source using the existing 1.15-second transition.
4. Stop and disconnect the outgoing source after its fade completes.
5. If assets finish loading after a phase was selected, start the currently selected phase rather than defaulting to Phase 1.

Phase 1, Phase 2, and Phase 3 each last 90 seconds, which equals six exact 15-second repetitions. The Ultimate finale starts 30 seconds after the Ultimate opening, which equals two exact repetitions. Under normal fight timing, each outgoing source therefore reaches its own loop boundary when the next state begins.

## Lab Behavior

Starting any Lab phase begins its mapped B2 section at offset zero. Selecting the same phase again also restarts that section so repeated tests remain deterministic.

## Failure Handling

- If an asset fails to load, keep sound effects functional and log the failed soundtrack asset.
- Ignore a stale source stop callback if a newer phase switch has already replaced it.
- Avoid accumulating connected source and gain nodes across repeated Lab tests.

## Validation

- Confirm all five assets have identical duration, sample rate, channel count, and frame count.
- Repeat each asset at least four times in an offline buffer and verify the loop-boundary sample delta is not an anomalous transient.
- Simulate all four 1.15-second crossfades and check for clipping, silence gaps, and unexpected level jumps.
- Verify Phase 1, Phase 2, Phase 3, Ultimate opening, and Ultimate finale in the Lab.
- Run the production build and confirm all five URLs return `audio/wav`.
- Confirm `MUSIC_TRACKS` references only the five B2 game assets after integration.
