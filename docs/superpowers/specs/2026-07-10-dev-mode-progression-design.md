# Dev Mode and Normal Progression Design

**Date:** 2026-07-10
**Status:** Approved for specification review

## Goal

Provide a persistent development mode for repeated local testing without weakening the player's normal progression.

## Mode Model

The game has two independent, locally persisted concerns:

- `devMode`: whether the developer convenience mode is active.
- `completedBosses`: the player's normal-mode victories.

They are stored together under a versioned local-storage key. Storage failures must fall back to a fresh normal profile in memory; the game remains playable and never exposes the Lab accidentally.

Changing `devMode` must not modify `completedBosses`. Victories earned while dev mode is active must not unlock bosses in the normal profile.

## Entry and Visibility

The main menu gains a compact `DEV` control. It toggles the mode and persists its value in the current browser profile.

When active, the menu visibly marks the session as development mode. The mark is informational rather than a new navigation destination.

## Normal Mode

Normal mode is the default for a new or unreadable profile.

- Cleopatra is initially available.
- Defeating a playable boss in a real fight records its completion and unlocks the next playable boss in the ordered boss roster.
- Bosses without an implemented fight remain unavailable, even if their place in the sequence has been reached.
- The Lab is not rendered in the combat HUD, phase selector, or normal result paths.

The normal progression is intentionally small but data-driven: boss definitions describe their order and whether a playable scene exists, while the profile determines whether the ordered predecessor has been completed.

## Development Mode

Development mode is a testing convenience only.

- Every boss with an implemented fight scene is selectable immediately.
- The normal real-fight flow remains available for every selectable boss.
- The existing Lab access is additionally available for those fights, including the current isolated-phase and Ultimate-victory behavior.
- The mode is retained after reloads and server restarts on the same browser/device.
- Development victories can show the usual victory presentation, but do not write normal progression completion.

An unimplemented future boss (currently Genghis Khan) remains visibly unavailable rather than becoming a dead-end selection.

## Architecture

Create a small progression module responsible for:

1. loading and validating the profile;
2. persisting a dev-mode toggle;
3. determining whether a boss is selectable in either mode;
4. recording a real normal-mode victory; and
5. exposing whether developer-only Lab affordances are allowed.

Both boss scenes receive their mode context when started. They use it only to decide whether to expose Lab entry points and whether a real victory should be recorded. Menu rendering reads the same module, eliminating duplicated unlock logic.

The existing fight, Lab scripts, timers, absorption animation, retry behavior, and audio behavior remain unchanged.

## Error Handling

- Invalid, outdated, or malformed stored values reset to the safe default profile.
- Failed local-storage reads or writes do not interrupt a scene; the session uses an in-memory normal profile.
- A boss definition without a scene is never routed to `scene.start`.

## Verification

1. Clear local storage: normal mode opens with only Cleopatra selectable and no Lab button.
2. Win Cleopatra in normal mode, reload, and confirm Leonardo becomes selectable.
3. Toggle `DEV`, reload, and confirm it stays active, all implemented bosses are selectable, and Lab appears during those fights.
4. Win Leonardo in dev mode, disable `DEV`, and confirm normal progression has not changed because of that dev victory.
5. Confirm Genghis remains unavailable until an implementation exists.
6. Exercise a normal fight, a dev Lab phase, a dev Ultimate completion, resize, and a local-storage failure fallback without console errors.
