# Cleopatra Character Visual Refinement

## Goal

Raise the character presentation of the Cleopatra fight to the same level as its refined attacks. The pass focuses on the player and Cleopatra, preserving the current code-drawn visual language, mobile clarity, controls, hitboxes, attack timing, and fight structure.

## Scope

- Redesign the player as a more expressive memory spark.
- Refine Cleopatra's existing ceremonial portrait without changing its footprint or replacing it with a full-body character.
- Add explicit visual states for movement, damage, casting, phase transitions, Ultimate, and Finale.
- Validate the result during real combat at mobile and desktop sizes.

Arena decoration, HUD icons, menus, attack visuals, mechanics, collision, and audio are outside this pass.

## Visual Approach

Use procedural vector drawing through Phaser Graphics. No sprite sheets or raster overlays are introduced. Character animation is driven by deterministic state values so the result stays crisp at different resolutions and inexpensive on mobile.

## Player: Memory Spark

The current circular core remains centered on the exact gameplay position and preserves the existing collision radius. Visual layers extend beyond it without participating in collision:

- A memory glyph derived from the COGNO diamond motif inside the core.
- A luminous outer shell with small openings and a slow orbital highlight.
- Five small, detached energy fragments behind the movement direction. The first fragment begins beyond the outer shell; the remaining fragments follow a subtle curve with decreasing size and opacity.
- Subtle stretch along the movement axis, capped so the player remains easy to locate.

### Player States

- **Idle:** slow breathing, orbiting highlight, and a fixed small set of motes.
- **Moving:** the shell and glyph orient to movement, the body stretches slightly, and detached fragments ease in with speed. No line or ribbon connects the fragments to the player, preventing the effect from reading as a tail.
- **Damaged:** a brief squash, visible fracture lines, and an outward ring at the moment damage is received.
- **Invulnerable:** translucent positional echoes replace the current alpha-only blinking while the solid core remains readable.

These effects never alter movement values, control response, player position, or hitbox size.

## Cleopatra: Living Ceremonial Portrait

Preserve the existing silhouette and proportions. Improve facial volume, headdress layering, collar detail, and controlled asymmetry so the portrait feels less rigid while remaining recognizably the same design.

### Cleopatra States

- **Idle:** restrained breathing, natural blinking, subtle gaze tracking toward the player, and delayed headdress sway.
- **Summoning cast:** collar and lower halo expand while the crown gem gathers cyan and gold light.
- **Solar cast:** eyes and crown align into a sharper gold pulse with a brief upward head motion.
- **Temporal cast:** the portrait offsets in two faint echoes while cyan and gold halo layers counter-rotate.
- **Phase transition:** posture rises, gaze locks to the player, and crown and halo layers open with the existing transition animation.
- **Ultimate opening:** movement becomes restrained and authoritative while the halo gains a second rhythm.
- **Finale:** motion becomes firmer, highlights intensify, and Cleopatra receives a distinct secondary halo cadence when she joins the arena.

Cast families map to existing cues without changing their timing:

| Visual family | Existing attack cues |
| --- | --- |
| Summoning | scarab, nile, glyph, army |
| Solar | wadjet, horus |
| Temporal | sands, maat |

## Architecture

Create `src/game/rendering/PlayerVisuals.ts` as a pure drawing module. `PlayerController` continues to own input, movement, visibility, damage, and hitbox state, and passes visual inputs such as time, position, movement direction, movement strength, last-hit age, and invulnerability state to the renderer.

Extend `CleopatraPortrait.ts` with explicit animation options: time, target direction, fight phase, transition intensity, cast family, cast progress, Ultimate state, and Finale intensity. Defaults render a valid idle portrait so menu and result usages remain compatible.

`CleopatraScene` stores the current short-lived cast cue and its start time. Existing attack spawn methods trigger the matching visual cue alongside their current audio and attack creation. Drawing reads this state but never changes script timing or attack behavior.

## Performance and Safety

- Reuse existing Graphics objects and fixed-count loops.
- Avoid per-frame Phaser object creation, textures, tweens, and particle emitters.
- Clamp all visual inputs and fall back to idle when no cast cue is active.
- Keep all visual extensions outside collision logic.
- Preserve existing public method behavior in `PlayerController` and current portrait call sites.

## Validation

- Capture mobile screenshots at 390 x 844 for idle, movement, damage, invulnerability, all three cast families, phase transition, Ultimate opening, and Finale.
- Capture a desktop combat screenshot and confirm stable layout and scale.
- Inspect dense attacks to ensure character effects do not obscure hazards or the player core.
- Verify the player collision radius and movement values remain unchanged.
- Check that menu and result portraits still render correctly with default options.
- Confirm no browser console errors and run the production build.
