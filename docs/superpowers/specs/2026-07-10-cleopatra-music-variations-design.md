# Cleopatra Boss Music Variations

## Goal

Create three short, directly comparable boss-music demos without changing the soundtrack currently used by the game. Each demo must communicate Cleopatra's Egyptian identity, escalate through the same five fight states, and sound compositionally distinct rather than like a light remix.

## Deliverables

- Three stereo WAV demos, each approximately 75 seconds long.
- Direct browser URLs served by the existing Vite app.
- Version A uses the current soundtrack as the comparison baseline.
- Versions B and C use new melodies, harmony, rhythm, and orchestration.
- The active soundtrack mapping in `GameAudio.ts` remains unchanged.

## Musical Directions

### A - Crown of the Nile

A condensed suite assembled from the five current soundtrack assets. It preserves the current hybrid Egyptian and cinematic identity and provides the baseline against which the new versions are judged.

### B - War of the Two Lands

An aggressive orchestral score driven by brass calls, string ostinatos, war drums, and Egyptian colors used as defining accents. Its finale should feel martial, royal, and larger than the current version.

### C - Ritual of Isis

A darker ritual score driven by ney-like leads, sistrum, frame-drum patterns, low choir, and less predictable rhythmic tension. During Ultimate and Finale it transforms into a forceful choral and orchestral climax.

## Shared Dramatic Structure

All three demos use the same approximate timeline so the comparison is fair:

1. Phase 1: introduction and threat establishment, 0-15 seconds.
2. Phase 2: stronger rhythmic motion, 15-30 seconds.
3. Phase 3: denser harmony and attack, 30-45 seconds.
4. Ultimate: major escalation, 45-60 seconds.
5. Finale: Cleopatra joins the fight, 60-75 seconds.

Short musical transitions join the segments without altering their relative duration.

## Implementation Boundaries

The demos are rendered offline as deterministic WAV assets. Runtime game audio remains asset-based and receives no new procedural music logic. A uses excerpts from the existing five WAV files; B and C are rendered as original linear suites with their own motifs and arrangements. Files live under `public/audio/demos/` and are not added to `MUSIC_TRACKS` until the user selects a winner.

## Audio Consistency

- Use the same sample rate and stereo format as the current soundtrack assets.
- Match perceived loudness closely enough that volume does not bias the comparison.
- Prevent clipping through peak limiting or normalization with headroom.
- Leave sound effects out of the demos so only the music is evaluated.

## Validation

- Confirm all three WAV files decode successfully and have the expected duration, channel count, and sample rate.
- Confirm peak levels remain below clipping.
- Confirm all files are served by Vite with an audio content type.
- Run the production build to ensure the added static assets do not disturb the app.
- Listen-check each transition and verify that B and C remain clearly distinguishable from A and from each other.

## Selection Step

The user listens to A, B, and C through direct browser links. Only after a preference is chosen will a selected direction be expanded or mapped into the five production loops used by the fight.
