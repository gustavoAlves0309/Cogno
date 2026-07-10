# Cleopatra Arena and HUD Refinement

## Goal

Refine the Cleopatra fight arena and combat HUD so they match the visual quality of the attacks and characters. The result should feel like an Egyptian memory chamber while remaining quieter than hazards, preserving mobile readability and all gameplay geometry.

## Scope

- Replace the technical arena grid with a ceremonial memory-chamber floor.
- Refine the arena frame, spatial reference marks, and phase response.
- Replace generic heart icons with memory-seal stability icons.
- Add a minimal persistent stage indicator for the five soundtrack and fight states.
- Restyle the Lab command while preserving its touch target and behavior.
- Preserve the existing large phase-transition banner.

Menus, result screens, characters, attack visuals, audio, mechanics, collision, arena bounds, and fight timing are outside this pass.

## Arena Direction

The arena remains the same square with the same `x`, `y`, and `size`. Its visual layers become:

1. A dark external stone slab with restrained edge depth.
2. A gold inlay channel defining the primary boundary.
3. A thin cyan inner channel reinforcing the memory-system identity.
4. Large low-contrast stone plates and geometric inlays instead of a uniform technical grid.
5. A nearly erased central memory cartouche used only as floor texture.
6. Small border seals at corners and edge centers for spatial reference.

The four red interior triangles are removed because they read as hazards. The central cartouche and floor marks remain substantially lower contrast than every telegraph, projectile, and player effect.

### Arena State Response

- Channels use the existing phase palette without changing geometry.
- Normal phase motion is limited to a very slow channel shimmer.
- Phase transitions send one short pulse through the border seals and channels.
- Ultimate and Finale intensify the border cadence without brightening the arena interior.

## HUD Direction

The real-fight HUD remains minimal and diegetic. It does not gain a timer or progress bar.

### Stability Seals

- Replace the three hearts with three diamond memory seals derived from the player glyph.
- Active seals use a pale core, gold contour, and subtle cyan inner line.
- Empty seals retain a dim outline so maximum stability remains readable.
- When stability decreases, the lost seal briefly cracks, dims, and releases a fixed set of small fragments.

### Fight Stage Indicator

Display a compact top-center indicator using Roman numerals and thin ceremonial lines:

| Indicator | Fight state |
| --- | --- |
| I | Phase 1 |
| II | Phase 2 |
| III | Phase 3 |
| IV | Ultimate opening |
| V | Ultimate Finale after Cleopatra enters |

The large banner continues to identify transitions; the persistent indicator remains secondary and does not repeat phase subtitles.

### Lab Command

- Preserve the current position, action, and minimum touch area.
- Replace the generic rounded button treatment with a straight ceremonial frame.
- Add a small memory-grid glyph beside compact `LAB` text.
- Keep sufficient contrast for interaction without competing with stability or attacks.

## Architecture

Create `src/game/rendering/ArenaVisuals.ts` as a pure Phaser Graphics renderer receiving arena bounds, time, visual stage `0-4`, and transition intensity.

Create `src/game/rendering/CombatHudVisuals.ts` as a pure renderer for stability seals, the stage indicator, and reusable Lab glyph geometry. `CleopatraScene` remains responsible for values and interaction.

Track the last displayed stability and the time it changed in `CleopatraScene` solely to animate a lost seal. Reuse the existing fight-phase and Ultimate-Finale timing to derive visual stage `0-4`; do not introduce a second gameplay phase clock.

Avoid per-frame Phaser object creation. Use existing Graphics objects, fixed-count loops, numeric drawing operations, and default-safe clamping.

## Safety Boundaries

- Do not change arena bounds, player radius, attack coordinates, collision, movement, or control zones.
- Do not draw decorative marks that resemble active red hazard telegraphs.
- Keep all floor decoration below player and attack depths.
- Preserve test-mode timer text and phase-selection behavior.
- Preserve the current phase-transition overlay timing and text.

## Validation

- Capture real-fight mobile screenshots at 390 x 844 for normal Phase 1, each phase transition, Ultimate opening, and Finale.
- Capture stability loss before, during, and after the seal-break animation.
- Capture dense attack combinations and confirm floor marks remain subordinate.
- Capture Lab selection and an active Lab phase.
- Capture desktop combat and confirm arena and HUD scale correctly.
- Confirm arena bounds, player movement limits, collision, and Lab touch target are unchanged.
- Confirm no browser console errors and run the production build.
