from pathlib import Path

from render_cleopatra_music_demos import (
    DEMO_SAMPLES,
    ROOT_DIR,
    SAMPLE_RATE,
    SEGMENT_SAMPLES,
    render_war_of_two_lands,
    stats,
)
from render_cleopatra_theme import write_wav


OUTPUT_DIR = ROOT_DIR / "public" / "audio"
TRACK_NAMES = (
    "cleopatra-b2-phase1.wav",
    "cleopatra-b2-phase2.wav",
    "cleopatra-b2-phase3.wav",
    "cleopatra-b2-ultimate.wav",
    "cleopatra-b2-finale.wav",
)


def main() -> None:
    soundtrack = render_war_of_two_lands(epic=True, fade_edges=False)
    if len(soundtrack) != DEMO_SAMPLES:
        raise ValueError(f"Expected {DEMO_SAMPLES} frames, received {len(soundtrack)}")

    for index, name in enumerate(TRACK_NAMES):
        start = index * SEGMENT_SAMPLES
        segment = soundtrack[start : start + SEGMENT_SAMPLES].copy()
        if len(segment) != SAMPLE_RATE * 15:
            raise ValueError(f"Unexpected segment length for {name}: {len(segment)}")

        path: Path = OUTPUT_DIR / name
        write_wav(path, segment)
        print(f"wrote {path.relative_to(ROOT_DIR)} ({stats(segment)})")


if __name__ == "__main__":
    main()
