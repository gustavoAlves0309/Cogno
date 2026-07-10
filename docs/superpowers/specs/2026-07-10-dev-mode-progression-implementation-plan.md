# Dev Mode and Normal Progression Implementation Plan

**Goal:** Add a persistent developer mode that unlocks playable bosses and Lab access without changing normal progression.

## 1. Isolate profile state

Create `src/game/progression/GameProgression.ts` with a versioned, validated local-storage profile:

- `devMode: boolean`;
- `completedBosses: BossId[]`;
- safe in-memory fallback when storage is unavailable or malformed;
- functions to toggle dev mode, inspect selectability, record normal victories, and decide whether the Lab is available.

Keep boss ordering and scene availability in a small shared boss definition list so the menu and progress rules use one source of truth.

## 2. Make menu selection data-driven

Refactor `CleopatraScene` to obtain its roster and enabled states from the progression module instead of the static temporary unlock flags.

- Normal mode: Cleopatra is initially selectable and Leonardo unlocks after a normal Cleopatra victory.
- Dev mode: Cleopatra and Leonardo are selectable immediately.
- Genghis remains visibly unavailable because no scene is implemented.
- Add a compact persistent `DEV` toggle to the main menu and an active-mode indicator.

## 3. Pass mode context into bosses

Start each playable boss with a `devMode` scene-data flag. Keep no global mutable scene state beyond the progression module.

In both Cleopatra and Leonardo scenes:

- show existing Lab controls only when `devMode` is true;
- preserve every existing Lab behavior unchanged when it is visible;
- route Menu actions without leaking fight-local state.

## 4. Record normal victories

At the end of a real victory only, notify the progression module about the completed boss if `devMode` is false.

Lab victories and all dev-mode victories must not write normal progression. Defeats, retries, and returns to menu leave profile state untouched.

## 5. Verify

Run TypeScript and a temporary production build. Test with browser/local storage:

1. fresh normal profile;
2. normal Cleopatra victory and reload;
3. persistent DEV toggle and all implemented bosses;
4. Lab visibility only under DEV;
5. a dev victory followed by return to normal;
6. malformed-storage fallback.
