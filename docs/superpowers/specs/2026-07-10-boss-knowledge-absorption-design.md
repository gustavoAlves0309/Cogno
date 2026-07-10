# Boss Knowledge Absorption Victory Design

## Goal

Replace the current golden player explosion with a short victory sequence that reads as the player absorbing Cleopatra's knowledge. The visual language must be reusable for later bosses without making every victory feel identical.

## Approved sequence

The sequence lasts roughly 2.5 seconds while gameplay and controls remain disabled.

1. **Recognition (0.0-0.4 s):** Cleopatra freezes under a brief overload; her aura contracts and the player remains visible at the position where the fight ended.
2. **Dissolution (0.4-1.35 s):** Cleopatra fades and contracts while gold/cyan glyph fragments separate from her portrait.
3. **Transfer (0.9-2.05 s):** the fragments follow staggered curved paths from the boss to the player, accompanied by restrained light threads.
4. **Integration (1.85-2.5 s):** the player's core brightens, briefly displays Cleopatra's knowledge seal, and emits a contained final pulse.
5. **Result:** the existing victory modal and actions appear after the absorption has resolved.

Defeat keeps its current timing and visual behavior.

## Visual responsibilities

The generic victory renderer owns the transfer language: deterministic particles, curved trajectories, connecting threads, an arrival glow, the boss-specific seal, and the final pulse. It accepts boss and player anchors, elapsed time/progress, colors, and a knowledge-symbol identifier.

The boss scene remains responsible for its portrait. During Cleopatra's victory, the scene progressively lowers the portrait alpha and scale and suppresses its external aura so no intact or ghost portrait remains after dissolution.

The player remains a recognizable, motionless memory core throughout the sequence. The final Cleopatra seal is temporary and does not imply a permanent gameplay upgrade yet.

## Reuse for future bosses

Future boss scenes reuse the same absorption renderer and timeline, while supplying:

- their own primary and secondary colors;
- a boss-specific knowledge seal;
- their own portrait collapse or dissolution treatment;
- optional timing variation within the same broad rhythm.

This keeps the meaning consistent—knowledge acquired—without forcing identical character animations.

## Responsive behavior

The final player anchor is stored relative to the arena, then resolved against the current arena each frame. This prevents the transfer target from drifting if the viewport changes during the ending.

## Validation

- Trigger victory deterministically and inspect the full sequence before the modal.
- Verify Cleopatra is no longer visibly intact at the end of dissolution.
- Verify fragments clearly travel boss-to-player and the player is visible as the receiver.
- Verify the result modal appears only after the final pulse.
- Verify defeat timing and animation are unchanged.
- Run the TypeScript/Vite production build and a mobile-sized browser smoke test without console errors.
