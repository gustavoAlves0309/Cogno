# Cleopatra Epic Music Revisions

## Goal

Create revised A2 and B2 comparison demos that feel more epic through dramatic escalation while preserving the musical identity the user already liked in A and B.

## Deliverables

- Two new stereo WAV demos, each exactly 75 seconds long.
- A2 and B2 remain separate from the existing A and B files.
- Direct browser URLs served by the current Vite app.
- No change to the soundtrack currently mapped in `GameAudio.ts`.

## Shared Structure

Both revisions retain five 15-second fight sections. Intensity grows primarily through arrangement and contrast rather than constant density:

1. Phase 1, 0-15 seconds: controlled opening with space around the main identity.
2. Phase 2, 15-30 seconds: rhythmic motion increases without reaching full orchestration.
3. Phase 3, 30-45 seconds: low strings, brass, and broader harmony begin the main climb.
4. Ultimate, 45-60 seconds: choir, heavier percussion, and larger transitions enter.
5. Finale, 60-75 seconds: maximum orchestral width, countermelody, and a decisive ending gesture.

## A2 Direction

A2 keeps the current A suite as its foundation. New offline-rendered layers add stronger transitions, low strings and brass from Phase 3 onward, choir during Ultimate, and full orchestral reinforcement during Finale. Existing melodies remain recognizable and are not replaced.

## B2 Direction

B2 keeps B's 128 BPM martial theme and core ostinato. Early orchestration is opened slightly to create headroom for escalation. Phase 3 expands the harmony, Ultimate strengthens war drums and brass calls, and Finale rises by one semitone with octave brass, a broader choir, reinforced percussion, and a high countermelody.

## Audio Boundaries

- Render all new material offline; add no procedural runtime music.
- Keep the existing A and B files unchanged.
- Match A2 and B2 perceived loudness to each other and to the original comparison demos.
- Keep peaks below clipping and preserve enough transient range for percussion.
- Store new files under `public/audio/demos/` without adding them to `MUSIC_TRACKS`.

## Validation

- Confirm stereo, 16-bit PCM, 22050 Hz, and 75-second duration.
- Measure overall and per-section RMS to verify a clear upward intensity curve.
- Confirm no clipping and comparable overall loudness.
- Confirm both files are served by Vite as audio assets.
- Run the production build.
- Keep A, B, A2, and B2 simultaneously available for listening comparison.
