# Leonardo — Codex Vivo Boss Design

## Goal

Create the second boss encounter around a human Leonardo da Vinci: an observant, obsessive author whose studies become increasingly refined deterministic hazards. The player survives by reading an invention from sketch to prototype to revision, rather than by reacting to random or tracking-heavy attacks.

This encounter retains the proven combat skeleton from Cleopatra so iteration can focus on Leonardo's novel visual language and spatial grammar.

## Scope and non-goals

In scope:

- a three-phase, survival-based Leonardo encounter plus a final Ultimate;
- six authored attack families with three readable versions each;
- a Phase Lab that can run each phase and the Ultimate in isolation;
- a boss-specific knowledge-absorption victory that reuses the shared victory language.

Out of scope:

- random attack selection, player-adaptive targeting, or mid-attack revisions;
- a permanent gameplay upgrade tied to the acquired knowledge seal;
- literal historical reconstruction of working Leonardo machines;
- new mechanics hidden behind fog, contrast loss, or visual-only effects.

## Narrative and visual identity

Leonardo is a mature human master in court clothing, with long hair and beard, ink-stained hands, and an increasingly dense halo of pages, annotations, red corrections, and diagrams. He begins composed and physical. As the fight develops, the Codex seems to take over the scene without erasing the human author behind it.

The arena resembles a living workshop page: parchment ground, sepia lines, red-chalk corrections, cold blue measurement marks, dark ink hazards, wood, bronze, rope, water channels, and perspectival grids.

The universal visual contract is:

- thin sepia line: an intention or construction;
- red chalk: a correction or incoming revision;
- filled dark ink: an active dangerous region;
- cold blue: geometry, measurement, or vanishing-point guidance;
- visible light: the safe reading in a Sfumato sequence.

This contract is never broken. The player, arena boundary, active danger, and safe route remain visually legible at all times.

## Fight structure

The first version uses the same encounter structure already established for Cleopatra:

- three stability seals;
- Phase I, II, and III each last 90 seconds;
- the Ultimate lasts 75 seconds;
- the phase timer remains visible throughout combat and Lab tests;
- the existing full-fight, retry, menu, and Phase Lab flows remain conceptually consistent.

Each normal phase follows this exact 90-second rhythm. An attack window includes its sketch, telegraph, active state, and recovery. The two-second revision interval is intentionally non-damaging and lets Leonardo visibly inspect or annotate the failed prototype before the next one.

| Time | Window |
|---|---|
| 0–13 s | primary study, Version 1 |
| 13–15 s | observation and red-chalk revision |
| 15–28 s | companion study, Version 1 |
| 28–30 s | observation and revision |
| 30–43 s | primary study, Version 2 |
| 43–45 s | observation and revision |
| 45–58 s | companion study, Version 2 |
| 58–60 s | observation and revision |
| 60–74 s | primary study, Version 3 |
| 74–76 s | observation and revision |
| 76–90 s | companion study, Version 3 |

Only one attack family is active in a normal-phase window. The player first learns its space, then its movement, then its revision; normal phases never combine two unfamiliar systems.

## Determinism and fairness contract

Every attack is an authored timeline, not a reaction to the player's current position. Versions modify exactly one meaningful variable at a time: count, route, timing, rotation reversal, gate state, pulse order, or light direction. They never alter a path, hitbox, or safe corridor after it becomes active.

All attacks follow the same lifecycle:

1. Leonardo observes and marks the intended study.
2. The drawing or prototype assembles with its full telegraph.
3. The attack becomes active using the shown geometry.
4. The attack resolves and Leonardo adds a visible correction before the next window.

No normal phase contains more than one active attack. The Ultimate contains at most two active learned systems, and each pairing is introduced before it fires. No hitbox may exist without its corresponding active visual.

## Phase I — Geometria do voo

Phase I teaches space first, then movement.

### Ponto de Fuga

Leonardo marks a vanishing point in blue, lays thin perspective lines, and fills the resulting region in dark ink only when it becomes dangerous.

- Version 1: one static vanishing point creates one simple wedge.
- Version 2: two points create two sequential wedges separated by a clear pause.
- Version 3: the marked point changes only between pulses, so the safe corridor relocates with advance notice.

### Asa em Estudo

An articulated wing and airflow arrows are sketched before a glider follows the displayed curve.

- Version 1: one diagonal gliding arc.
- Version 2: two connected passes, with a visible pause at the return.
- Version 3: direction changes only at pre-marked pivots along a broken but readable route.

The phase schedule uses Ponto de Fuga as the primary study and Asa em Estudo as the companion study.

## Phase II — Máquinas e passagem

Phase II turns spatial reading into controlled corridor and rotation management.

### Ponte Salvadora

Two banks appear, a bridge assembles from wood and construction lines, and water or dark ink flows through the rest of the arena. The bridge is the safe route.

- Version 1: one continuous safe corridor.
- Version 2: two gates change the safe corridor in a visibly locked sequence.
- Version 3: the bridge splits; one half remains safe while the other retracts only after a warning.

### Carro Blindado

A circular floor drawing, gears, ropes, and wooden-bronze armour assemble into a slow tank. The turret visibly marks its firing fan before it sweeps.

- Version 1: one turret produces a front firing fan.
- Version 2: the turret reverses rotation after its first firing sequence.
- Version 3: two modular barrels alternate, each with a distinct pause.

The Carro never chases the player. Its readable rotation, fan, reversal, and gaps are the puzzle. Phase II uses Ponte Salvadora as primary and Carro Blindado as companion.

## Phase III — Corpo e percepção

Phase III asks the player to read rhythm and illumination without concealing the combat state.

### Válvula do Coração

A stylized anatomical heart cross-section shows chambers, vessels, and valves. Warm red and copper pulses move through the diagram; no gore is used.

- Version 1: a simple, predictable central pulse.
- Version 2: chambers alternate and invert the dangerous side.
- Version 3: two smaller pulses lead into one larger pulse with an explicit rhythm.

### Sfumato

Sfumato lowers contrast in a region but never makes information invisible. Light direction signals the safe reading, while the player, core, boundaries, and hazards retain sufficient contrast.

- Version 1: one slow shadow veil with a lit safe edge.
- Version 2: two veils cross, leaving a lit corridor.
- Version 3: light direction changes only between pulses and is announced by a red correction mark.

Phase III uses Válvula do Coração as primary and Sfumato as companion.

## Ultimate — Dilúvio do Codex

The Ultimate is a 75-second synthesis of studies already learned. It must feel like Leonardo has integrated the player's responses into a final controlled experiment, not like a sudden random gauntlet.

| Time | Sequence |
|---|---|
| 0–8 s | Pages rupture, ink and water enter the background, perspective redraws the arena, and Leonardo observes. This opening is non-damaging. |
| 8–26 s | Ponto de Fuga V3 + Asa em Estudo V2. The wedge is drawn first; the wing route is then marked through a shown gap. |
| 26–30 s | Full release, inspection, and red correction. |
| 30–48 s | Ponte Salvadora V2 + Carro Blindado V2. The safe bridge locks first; the turret then marks and sweeps its fan. |
| 48–52 s | Full release, inspection, and red correction. |
| 52–67 s | Válvula do Coração V3 + Sfumato V2. The lit route appears before the pulse rhythm begins. |
| 67–75 s | Final evaluation: one shortened Válvula V3 pulse sequence continues through the fixed lit corridor from Sfumato V2 while pages, water, and ink dissolve. No fourth mechanic is introduced. |

The only overlaps are these three known pairs. Each pair gets its own complete drawing before either damage source activates. The finale may be visually dense but must preserve the same safe-route and rhythm cues taught in Phase III.

## Victory and knowledge seal

Surviving the Ultimate initiates the shared knowledge-absorption flow rather than a player explosion. Leonardo remains visibly human while the Codex pages detach. Perspective lines, a spiral of ink, red corrections, and an eye-like mark converge on the player; Leonardo's face dissolves last.

The player receives a temporary Leonardo seal built from a spiral, eye, and perspective lines. It represents the acquired method of observation, testing, and correction, not ownership of any one historical machine.

The Phase Lab's isolated Ultimate uses this same ending. Its end modal offers the established Lab-specific retry path, while a real victory retains its normal retry and menu actions.

## Proposed implementation boundaries

The implementation keeps encounter orchestration separate from per-study mechanics:

- LeonardoScene owns mode, seals, phase selection, timer, the fixed schedule, attack lifetime, transitions, Lab routing, and end origin.
- A data-only phase schedule describes attack id, version, start, end, and pairing; it contains no random branching.
- Each attack family owns only its telegraph, active collision geometry, revision visuals, and cleanup.
- LeonardoPortrait owns the human portrait, observation pose, Codex growth, and boss-specific dissolution.
- Shared MemoryAbsorptionVisuals receives Leonardo-specific anchors, colors, and seal geometry rather than duplicating the victory timeline.
- The audio layer reinforces pencil scratches, paper, gears, air, water, and pulse rhythm without becoming a second source of gameplay information.

At phase changes, player defeat, retry, Lab return, resize, and either ending, the scene clears every active attack's hitboxes, timers, transient drawings, and audio loops before the next state becomes interactive. A schedule entry cannot activate a hitbox until its telegraph object has been created; invalid or interrupted entries resolve by cleanup rather than by leaving damage active.

## Validation and acceptance criteria

Automated or deterministic checks should verify:

- each phase starts the exact six version windows at their prescribed times;
- no version mutates after its active geometry begins;
- all transitions leave zero live attack collision objects and no stale timers;
- Lab Phase I–III returns to the selector, while Lab Ultimate plays the complete victory flow;
- real victory and defeat keep their established end actions;
- viewport resize preserves telegraphs, hitboxes, player anchor, and Leonardo's absorption target.

Manual mobile validation should verify that:

- every safe route can be understood before it is required;
- Sfumato never hides the player, boundaries, or an active hazard;
- Ultimate pairings are difficult through composition, not visual ambiguity;
- the timer is readable in every phase and the Lab makes each system practical to test;
- the final absorption clearly reads as the player acquiring Leonardo's knowledge.

## Historical inspiration anchors

The encounter draws from Leonardo's notebooks, studies of flight, bridges and waterways, war machines, anatomy, and atmospheric painting technique. These references guide the fiction without claiming that every sketch was a completed invention:

- [Museo Leonardiano: flight studies](https://museoleonardiano.it/en/collezione/flight-studies/)
- [Museo Leonardiano: bridges](https://museoleonardiano.it/en/collezione/bridges/)
- [Museo Leonardiano: war machines](https://museoleonardiano.it/en/collezione/war-machines/)
- [Royal Collection Trust: Leonardo's study of anatomy](https://www.rct.uk/collection/stories/leonardo-in-the-royal-collection/leonardos-study-of-anatomy)
- [National Gallery: sfumato](https://www.nationalgallery.org.uk/paintings/glossary/sfumato)
