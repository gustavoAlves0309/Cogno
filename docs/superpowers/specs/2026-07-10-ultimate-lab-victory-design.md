# Ultimate Lab Victory Design

## Goal

Allow the Phase Lab to test the complete final Ultimate sequence followed immediately by the existing knowledge-absorption victory animation.

## Approved behavior

Only the Ultimate phase changes its completion behavior in the Lab.

1. Phase I, II, and III keep their current completion flow and return to the Lab selector.
2. When the Ultimate script reaches its normal duration, it starts the same victory flow used by the full fight.
3. The existing Cleopatra collapse, knowledge fragments, player integration, and 2.5-second modal delay are reused without a second animation implementation.
4. The victory modal knows it came from the Ultimate Lab test and offers two test-oriented actions:
   - `Retry Ultimate`, which immediately starts the isolated Ultimate again;
   - `Lab`, which returns to the phase selector.
5. A victory from the real fight keeps its existing `Retry` and `Menu` actions.
6. Player defeat in the Lab remains its current reset behavior; it does not enter the end modal.

## Architecture

The scene stores a small end-origin value when it calls `finish`. The value is clear at the start of a real fight, Lab selector, and ordinary Lab phases. It is set only when the Ultimate Lab phase completes.

The generic end renderer remains unaware of Lab state. Only the scene's end actions use the origin to choose their labels and callbacks, keeping the victory animation reusable for future bosses and test contexts.

## Validation

- Start Ultimate from the Lab and let its script finish.
- Confirm that the absorption animation begins instead of returning to the phase buttons.
- Confirm that `Retry Ultimate` starts only the Ultimate and `Lab` returns to the selector.
- Confirm phases I–III still return to the selector on completion.
- Confirm real-fight victory still exposes `Retry` and `Menu`.
- Run the production build and capture the Ultimate-to-victory flow in a mobile viewport without console errors.
