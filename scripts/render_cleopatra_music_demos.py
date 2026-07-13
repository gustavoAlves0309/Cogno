from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

import render_cleopatra_theme as theme


SAMPLE_RATE = theme.SAMPLE_RATE
SEGMENT_SECONDS = 15.0
DEMO_SECONDS = 75.0
SEGMENT_SAMPLES = int(SEGMENT_SECONDS * SAMPLE_RATE)
DEMO_SAMPLES = int(DEMO_SECONDS * SAMPLE_RATE)
ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "public" / "audio" / "demos"
RNG = np.random.default_rng(2601)


def reset_rng(seed: int) -> None:
    global RNG
    RNG = np.random.default_rng(seed)
    theme.RNG = np.random.default_rng(seed + 97)


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as handle:
        if handle.getnchannels() != 2 or handle.getsampwidth() != 2:
            raise ValueError(f"Expected stereo 16-bit WAV: {path}")
        if handle.getframerate() != SAMPLE_RATE:
            raise ValueError(f"Expected {SAMPLE_RATE} Hz WAV: {path}")
        frames = handle.readframes(handle.getnframes())

    return np.frombuffer(frames, dtype="<i2").reshape(-1, 2).astype(np.float32) / 32768.0


def master(buffer: np.ndarray, target_rms: float = 0.155, fade_edges: bool = True) -> np.ndarray:
    mastered = buffer.astype(np.float32, copy=True)
    mastered -= np.mean(mastered, axis=0, keepdims=True)
    mastered = np.tanh(mastered * 1.28) / math.tanh(1.28)

    for _ in range(3):
        rms = float(np.sqrt(np.mean(mastered * mastered)))
        if rms > 0:
            mastered *= target_rms / rms

        magnitude = np.abs(mastered)
        if float(np.max(magnitude)) <= 0.93:
            break
        threshold = 0.62
        compressed = threshold + (magnitude - threshold) * 0.22
        mastered = np.sign(mastered) * np.where(magnitude > threshold, compressed, magnitude)

    peak = float(np.max(np.abs(mastered))) or 1.0
    if peak > 0.93:
        mastered *= 0.93 / peak

    if fade_edges:
        fade_in = int(0.06 * SAMPLE_RATE)
        fade_out = int(0.45 * SAMPLE_RATE)
        mastered[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)[:, None]
        mastered[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)[:, None]
    return mastered.astype(np.float32)


def apply_section_gains(buffer: np.ndarray, gains: list[float], transition_seconds: float = 0.8) -> np.ndarray:
    if len(gains) != 5:
        raise ValueError("Expected one gain for each of the five demo sections")

    times = [0.0]
    values = [gains[0]]
    half_transition = transition_seconds / 2
    for section in range(1, len(gains)):
        boundary = section * SEGMENT_SECONDS
        times.extend((boundary - half_transition, boundary + half_transition))
        values.extend((gains[section - 1], gains[section]))
    times.append(DEMO_SECONDS)
    values.append(gains[-1])

    sample_times = np.arange(len(buffer), dtype=np.float32) / SAMPLE_RATE
    envelope = np.interp(sample_times, times, values).astype(np.float32)
    return buffer * envelope[:, None]


def noise_burst(seconds: float, decay: float, metallic: bool = False) -> np.ndarray:
    length = max(1, int(seconds * SAMPLE_RATE))
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, length).astype(np.float32)
    noise = np.concatenate(([0.0], np.diff(noise))).astype(np.float32)
    signal = noise * np.exp(-t * decay)
    if metallic:
        for freq, gain in ((1830, 0.22), (2710, 0.17), (4210, 0.12)):
            signal += np.sin(2 * np.pi * freq * t + RNG.random() * 2 * np.pi) * gain * np.exp(-t * decay * 0.7)
    return signal.astype(np.float32)


def war_drum(seconds: float = 0.58) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    frequency = 72 * np.exp(-t * 12) + 35
    phase = 2 * np.pi * np.cumsum(frequency) / SAMPLE_RATE
    body = np.sin(phase) * np.exp(-t * 4.8)
    overtone = np.sin(phase * 1.93) * np.exp(-t * 7.2) * 0.28
    strike = RNG.uniform(-1, 1, length).astype(np.float32) * np.exp(-t * 30) * 0.18
    return (body + overtone + strike).astype(np.float32)


def frame_drum(seconds: float = 0.38) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    frequency = 118 * np.exp(-t * 14) + 52
    phase = 2 * np.pi * np.cumsum(frequency) / SAMPLE_RATE
    body = np.sin(phase) * np.exp(-t * 7.5)
    rim = noise_burst(seconds, 25) * 0.22
    return (body + rim).astype(np.float32)


def rising_cymbal(seconds: float = 1.2) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, length).astype(np.float32)
    high = np.concatenate(([0.0], np.diff(noise))).astype(np.float32)
    envelope = np.linspace(0, 1, length, dtype=np.float32) ** 2.2
    shimmer = np.sin(2 * np.pi * (900 * t + 1700 * t * t)) * 0.12
    return (high * 0.5 + shimmer) * envelope


def bell(seconds: float = 1.7) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    signal = np.zeros(length, dtype=np.float32)
    for freq, gain, decay in ((525, 0.55, 2.2), (781, 0.34, 2.8), (1197, 0.22, 3.4), (1808, 0.12, 4.2)):
        signal += np.sin(2 * np.pi * freq * t + RNG.random() * 2 * np.pi) * gain * np.exp(-t * decay)
    return signal


def string_note(freq: float, seconds: float, short: bool = True) -> np.ndarray:
    attack = 0.012 if short else 0.16
    release = min(seconds * 0.45, 0.28 if short else 0.7)
    return theme.tone(freq, seconds, (1, 0.48, 0.27, 0.16, 0.09), vibrato=0.0022, attack=attack, release=release)


def brass_note(freq: float, seconds: float) -> np.ndarray:
    return theme.tone(freq, seconds, (1, 0.72, 0.46, 0.29, 0.17, 0.09), vibrato=0.0012, attack=0.035, release=min(0.42, seconds * 0.4))


def choir_note(freq: float, seconds: float, bright: bool = False) -> np.ndarray:
    harmonics = (1, 0.63, 0.25, 0.16, 0.09) if bright else (1, 0.52, 0.19, 0.1)
    main = theme.tone(freq, seconds, harmonics, vibrato=0.0035, attack=0.32, release=min(0.8, seconds * 0.38))
    shadow = theme.tone(freq * 1.004, seconds, harmonics, vibrato=0.0026, attack=0.38, release=min(0.9, seconds * 0.42))
    return (main + shadow * 0.72) / 1.72


def reed_note(freq: float, seconds: float, intense: bool = False) -> np.ndarray:
    tone = theme.tone(freq, seconds, (1, 0.21, 0.075, 0.025), vibrato=0.009 if intense else 0.0065, attack=0.035, release=min(0.22, seconds * 0.35))
    breath = RNG.uniform(-1, 1, len(tone)).astype(np.float32)
    breath *= theme.envelope(len(tone), 0.025, 0.06, 0.28, min(0.18, seconds * 0.3))
    return tone + breath * (0.075 if intense else 0.052)


def add_transition(buffer: np.ndarray, at: float, gain: float) -> None:
    theme.add(buffer, at - 1.2, rising_cymbal(), gain, pan=0.1)
    theme.add(buffer, at, war_drum(0.75), gain * 1.35, pan=0)
    theme.add(buffer, at, noise_burst(0.9, 5.2, metallic=True), gain * 0.42, pan=-0.08)


def assemble_baseline() -> np.ndarray:
    names = [
        "cleopatra-boss-phase1.wav",
        "cleopatra-boss-phase2.wav",
        "cleopatra-boss-phase3.wav",
        "cleopatra-boss-ultimate.wav",
        "cleopatra-boss-finale.wav",
    ]
    tracks = [read_wav(ROOT_DIR / "public" / "audio" / name) for name in names]
    fade_samples = int(0.7 * SAMPLE_RATE)
    demo = np.zeros((DEMO_SAMPLES, 2), dtype=np.float32)

    if len(tracks[0]) < SEGMENT_SAMPLES:
        raise ValueError("Current soundtrack asset is too short for the comparison demo")
    demo[:SEGMENT_SAMPLES] = tracks[0][:SEGMENT_SAMPLES]

    fade = np.linspace(0, 1, fade_samples, dtype=np.float32)
    fade_out = np.cos(fade * math.pi / 2)[:, None]
    fade_in = np.sin(fade * math.pi / 2)[:, None]

    for index, track in enumerate(tracks[1:], start=1):
        required = SEGMENT_SAMPLES + fade_samples
        if len(track) < required:
            raise ValueError(f"Current soundtrack asset is too short: {names[index]}")
        boundary = index * SEGMENT_SAMPLES
        demo[boundary - fade_samples : boundary] = (
            demo[boundary - fade_samples : boundary] * fade_out + track[:fade_samples] * fade_in
        )
        demo[boundary : boundary + SEGMENT_SAMPLES] = track[fade_samples:required]

    return demo


def render_baseline() -> np.ndarray:
    return master(assemble_baseline())


def add_war_brass_chord(buffer: np.ndarray, start: float, tonic: float, phase: int, length: float) -> None:
    for degree, octave, pan in ((0, 0, -0.34), (4, 0, 0.31), (7, 0, 0.02), (2, 1, 0.16)):
        signal = brass_note(theme.hijaz(tonic, degree, octave), length)
        theme.add(buffer, start, signal, 0.042 + phase * 0.008, pan)


def add_war_choir(buffer: np.ndarray, start: float, tonic: float, phase: int, length: float) -> None:
    for degree, octave, pan in ((0, -1, -0.3), (4, -1, 0.28), (0, 0, 0.0)):
        signal = choir_note(theme.hijaz(tonic, degree, octave), length, bright=phase >= 4)
        theme.add(buffer, start, signal, 0.032 + phase * 0.008, pan)


def add_war_theme(buffer: np.ndarray, start: float, tonic: float, beat: float, phase: int) -> None:
    degrees = [0, 4, 7, 6, 4, 2, 1, 0]
    durations = [0.75, 0.5, 0.5, 0.75, 0.5, 0.5, 0.25, 0.25]
    cursor = start
    for degree, beats in zip(degrees, durations):
        seconds = beat * beats * 1.28
        signal = brass_note(theme.hijaz(tonic, degree, 1), seconds)
        theme.add(buffer, cursor, signal, 0.052 + phase * 0.007, pan=0.08)
        cursor += beat * beats


def add_epic_counterline(buffer: np.ndarray, start: float, tonic: float, beat: float, gain: float) -> None:
    degrees = [7, 9, 8, 7, 6, 4, 5, 7]
    for index, degree in enumerate(degrees):
        note = string_note(theme.hijaz(tonic, degree, 2), beat * 0.43, short=True)
        theme.add(buffer, start + index * beat * 0.5, note, gain, pan=-0.36 if index % 2 else 0.36)


def render_epic_crown() -> np.ndarray:
    reset_rng(4201)
    buffer = apply_section_gains(assemble_baseline(), [0.80, 0.86, 0.97, 1.08, 1.18])
    overlay = np.zeros_like(buffer)
    beat = 60 / 132
    bar_length = beat * 4

    for phase in range(2, 5):
        section_start = phase * SEGMENT_SECONDS
        section_end = section_start + SEGMENT_SECONDS
        bars = math.ceil(SEGMENT_SECONDS / bar_length)
        for local_bar in range(bars):
            start = section_start + local_bar * bar_length
            if start >= section_end:
                break
            root = theme.ROOTS[local_bar % len(theme.ROOTS)]

            for degree, pan in ((0, -0.32), (4, 0.3)):
                low_strings = string_note(theme.hijaz(root, degree, -1), bar_length * 1.04, short=False)
                theme.add(overlay, start, low_strings, 0.014 + (phase - 2) * 0.006, pan)

            brass_interval = 4 if phase == 2 else 2
            if local_bar % brass_interval == 0:
                add_war_brass_chord(overlay, start, root, phase, beat * (1.65 if phase == 2 else 1.3))

            if phase >= 3:
                drum_positions = [0, 2.5] if phase == 3 else [0, 1.5, 2, 3.25]
                for index, position in enumerate(drum_positions):
                    theme.add(overlay, start + position * beat, war_drum(), 0.10 + phase * 0.009, pan=-0.1 if index % 2 else 0.08)
                add_war_choir(overlay, start, root, phase, bar_length * 1.03)

            if phase >= 4:
                add_epic_counterline(overlay, start, root, beat, 0.024)
                if local_bar % 2 == 1:
                    add_war_brass_chord(overlay, start + beat * 2, root, phase, beat * 1.15)

    for boundary, gain in zip((15, 30, 45, 60), (0.045, 0.07, 0.11, 0.16)):
        add_transition(overlay, boundary, gain)

    final_tonic = theme.ROOTS[0]
    add_war_brass_chord(overlay, 73.15, final_tonic, 4, 1.55)
    add_war_choir(overlay, 73.05, final_tonic, 4, 1.7)
    theme.add(overlay, 73.2, noise_burst(1.5, 3.8, metallic=True), 0.13, pan=0.05)

    overlay = theme.add_reverb(overlay, 0.62)
    return master(buffer + overlay)


def render_war_of_two_lands(epic: bool = False, fade_edges: bool = True) -> np.ndarray:
    reset_rng(4601 if epic else 2601)
    bpm = 128
    beat = 60 / bpm
    bar_length = beat * 4
    bars = 40
    tonic = 98.0
    roots = [98.0, 87.31, 103.83, 98.0]
    ostinato = [0, 4, 7, 4, 3, 4, 1, 4, 0, 4, 6, 4, 2, 4, 3, 1]
    buffer = np.zeros((DEMO_SAMPLES, 2), dtype=np.float32)

    for bar in range(bars):
        phase = min(4, bar // 8)
        phase_bar = bar % 8
        start = bar * bar_length
        root = roots[bar % len(roots)]
        tonal_lift = 2 ** (1 / 12) if epic and phase >= 4 else 1.0
        current_tonic = tonic * tonal_lift
        root *= tonal_lift

        for degree, pan in ((0, -0.3), (4, 0.3)):
            sustained = string_note(theme.hijaz(root, degree, -1), bar_length * 1.06, short=False)
            theme.add(buffer, start, sustained, 0.038 + phase * 0.006, pan)

        bass_positions = [0, 2] if phase < 2 else [0, 1.5, 2, 3.25]
        for position in bass_positions:
            bass = string_note(theme.hijaz(root, 0, -1), beat * 0.78, short=True)
            theme.add(buffer, start + position * beat, bass, 0.07 + phase * 0.006, pan=-0.05)

        drum_positions = [0, 2.75]
        if phase >= 1:
            drum_positions += [1.5]
        if phase >= 2:
            drum_positions += [2, 3.5]
        if phase >= 4:
            drum_positions += [0.75, 2.5]
        for index, position in enumerate(sorted(drum_positions)):
            theme.add(buffer, start + position * beat, war_drum(), 0.19 + phase * 0.016, pan=-0.12 if index % 2 else 0.08)

        if phase >= 1:
            metal_positions = [1, 3]
            if phase >= 3:
                metal_positions += [0.5, 1.5, 2.5, 3.5]
            for index, position in enumerate(metal_positions):
                theme.add(buffer, start + position * beat, noise_burst(0.18, 24, metallic=True), 0.052 + phase * 0.006, pan=0.34 if index % 2 else -0.28)

        subdivision = 1.0 if phase == 0 else 0.5 if phase < 3 else 0.25
        steps = int(4 / subdivision)
        for step in range(steps):
            degree = ostinato[(bar * steps + step) % len(ostinato)]
            seconds = max(0.075, beat * subdivision * 0.82)
            note = string_note(theme.hijaz(current_tonic, degree, 1), seconds, short=True)
            pan = -0.48 if step % 2 == 0 else 0.48
            theme.add(buffer, start + step * subdivision * beat, note, 0.027 + phase * 0.004, pan)
            if phase >= 4 and step % 2 == 0:
                lower = string_note(theme.hijaz(current_tonic, degree, 0), seconds, short=True)
                theme.add(buffer, start + step * subdivision * beat, lower, 0.023, -pan * 0.7)

        if phase_bar in (0, 4) or (phase >= 3 and phase_bar % 2 == 0):
            add_war_brass_chord(buffer, start, current_tonic, phase, beat * (1.7 if phase < 3 else 1.25))
        if phase_bar in (2, 6):
            add_war_theme(buffer, start + beat * 0.12, current_tonic, beat, phase)
        if phase >= 2:
            add_war_choir(buffer, start, current_tonic, phase, bar_length * 1.04)

        if epic and phase >= 2:
            high_harmony = string_note(theme.hijaz(current_tonic, 7, 0), bar_length * 1.02, short=False)
            theme.add(buffer, start, high_harmony, 0.013 + (phase - 2) * 0.004, pan=0.14)
        if epic and phase == 3:
            for index, position in enumerate((0.75, 2.5)):
                theme.add(buffer, start + position * beat, war_drum(), 0.13, pan=-0.08 if index else 0.08)
        if epic and phase >= 4:
            add_epic_counterline(buffer, start, current_tonic, beat, 0.027)
            high_choir = choir_note(theme.hijaz(current_tonic, 7, 0), bar_length * 1.02, bright=True)
            theme.add(buffer, start, high_choir, 0.045, pan=0.08)
            if phase_bar % 2 == 1:
                add_war_brass_chord(buffer, start + beat * 2, current_tonic, phase, beat * 1.12)

        if phase_bar == 7:
            reed_degrees = [7, 6, 4, 3, 2, 1]
            for index, degree in enumerate(reed_degrees):
                note = reed_note(theme.hijaz(current_tonic, degree, 2), beat * 0.42, intense=phase >= 3)
                theme.add(buffer, start + beat * (0.3 + index * 0.5), note, 0.037 + phase * 0.004, pan=-0.16)

        if phase >= 3 and phase_bar % 2 == 1:
            theme.add(buffer, start + beat * 3.45, noise_burst(0.7, 6.2, metallic=True), 0.072 + phase * 0.008, pan=0.24)

    for boundary, epic_gain in zip((15, 30, 45, 60), (0.07, 0.09, 0.14, 0.2)):
        gain = epic_gain if epic else 0.11 if boundary < 45 else 0.15
        add_transition(buffer, boundary, gain)

    if epic:
        finale_tonic = tonic * (2 ** (1 / 12))
        add_war_brass_chord(buffer, 73.1, finale_tonic, 4, 1.6)
        add_war_choir(buffer, 73.0, finale_tonic, 4, 1.75)
        theme.add(buffer, 73.16, noise_burst(1.6, 3.5, metallic=True), 0.15, pan=0.06)
        buffer = apply_section_gains(buffer, [0.78, 0.86, 0.98, 1.1, 1.22])

    buffer = theme.add_reverb(buffer, 0.64 if epic else 0.58)
    return master(buffer, fade_edges=fade_edges)


def add_ritual_choir(buffer: np.ndarray, start: float, tonic: float, phase: int, length: float) -> None:
    voices = ((0, -1, -0.28), (2, -1, 0.25), (4, -1, 0.0))
    for degree, octave, pan in voices:
        voice = choir_note(theme.hijaz(tonic, degree, octave), length, bright=phase >= 4)
        theme.add(buffer, start, voice, 0.038 + phase * 0.009, pan)


def add_ritual_reed_phrase(buffer: np.ndarray, start: float, tonic: float, beat: float, phase: int) -> None:
    degrees = [7, 6, 4, 5, 3, 1, 2, 0]
    durations = [0.5, 0.5, 0.75, 0.5, 0.5, 0.75, 0.5, 1.0]
    cursor = start
    for degree, beats in zip(degrees, durations):
        length = beat * beats * 1.22
        reed = reed_note(theme.hijaz(tonic, degree, 2), length, intense=phase >= 3)
        theme.add(buffer, cursor, reed, 0.046 + phase * 0.006, pan=-0.2 if degree % 2 else 0.16)
        cursor += beat * beats


def add_ritual_brass(buffer: np.ndarray, start: float, tonic: float, phase: int, beat: float) -> None:
    for degree, octave, pan in ((0, 0, -0.34), (4, 0, 0.3), (7, 0, 0.0)):
        note = brass_note(theme.hijaz(tonic, degree, octave), beat * 1.65)
        theme.add(buffer, start, note, 0.047 + phase * 0.008, pan)


def render_ritual_of_isis() -> np.ndarray:
    reset_rng(3103)
    bpm = 120
    beat = 60 / bpm
    bar_length = beat * 5
    bars = 30
    base_tonic = 73.42
    roots = [73.42, 77.78, 73.42, 65.41, 69.30, 73.42]
    pluck_pattern = [0, 4, 1, 4, 3, 5, 2, 4, 1, 3]
    buffer = np.zeros((DEMO_SAMPLES, 2), dtype=np.float32)

    for bar in range(bars):
        phase = min(4, bar // 6)
        phase_bar = bar % 6
        start = bar * bar_length
        tonic = base_tonic * (2 ** (1 / 12)) if phase >= 4 else base_tonic
        root = roots[phase_bar] * (2 ** (1 / 12)) if phase >= 4 else roots[phase_bar]

        for degree, pan in ((0, -0.2), (4, 0.22)):
            drone = theme.tone(theme.hijaz(root, degree, -1), bar_length * 1.08, (1, 0.31, 0.13, 0.06), vibrato=0.004, attack=0.34, release=0.8)
            theme.add(buffer, start, drone, 0.055 + phase * 0.006, pan)

        drum_positions = [0, 3]
        if phase >= 1:
            drum_positions += [1.5, 4.25]
        if phase >= 2:
            drum_positions += [2.5]
        if phase >= 3:
            drum_positions += [0.75, 3.75]
        if phase >= 4:
            drum_positions += [2, 4.5]
        for index, position in enumerate(sorted(drum_positions)):
            theme.add(buffer, start + position * beat, frame_drum(), 0.16 + phase * 0.016, pan=-0.16 if index % 2 else 0.12)

        rattle_positions = [1, 2.75, 4]
        if phase >= 2:
            rattle_positions += [0.5, 2, 3.5, 4.5]
        for index, position in enumerate(rattle_positions):
            theme.add(buffer, start + position * beat, noise_burst(0.12, 32, metallic=True), 0.034 + phase * 0.006, pan=0.42 if index % 2 else -0.38)

        if phase >= 1:
            steps = 10 if phase < 3 else 20
            subdivision = 5 / steps
            for step in range(steps):
                if phase == 1 and step % 2 == 1:
                    continue
                degree = pluck_pattern[(bar * steps + step) % len(pluck_pattern)]
                note = theme.pluck(theme.hijaz(tonic, degree, 1 if phase < 4 else 2), beat * 0.58)
                pan = -0.46 if step % 2 == 0 else 0.46
                theme.add(buffer, start + step * subdivision * beat, note, 0.03 + phase * 0.004, pan)

        phrase_bars = (1, 4) if phase == 0 else (1, 3, 5)
        if phase_bar in phrase_bars:
            add_ritual_reed_phrase(buffer, start + beat * 0.08, tonic, beat, phase)

        if phase >= 2:
            add_ritual_choir(buffer, start, tonic, phase, bar_length * 1.04)
        if phase >= 3 and phase_bar in (0, 2, 4):
            low_call = choir_note(theme.hijaz(tonic, 0, -1), beat * 1.2, bright=phase >= 4)
            theme.add(buffer, start + beat * 2.9, low_call, 0.085 + phase * 0.008, pan=0)
        if phase >= 4 and phase_bar % 2 == 0:
            add_ritual_brass(buffer, start, tonic, phase, beat)
            for step in range(10):
                degree = pluck_pattern[(phase_bar * 10 + step) % len(pluck_pattern)]
                pulse = string_note(theme.hijaz(tonic, degree, 1), beat * 0.34, short=True)
                theme.add(buffer, start + step * beat * 0.5, pulse, 0.035, -0.35 if step % 2 else 0.35)

        if phase_bar == 5:
            theme.add(buffer, start + beat * 4.15, bell(), 0.08 + phase * 0.012, pan=0.18)
        if phase >= 3 and phase_bar % 2 == 1:
            theme.add(buffer, start + beat * 4.4, theme.sistrum(0.55), 0.11 + phase * 0.012, pan=-0.24)

    for boundary in (15, 30, 45, 60):
        theme.add(buffer, boundary - 1.5, rising_cymbal(1.5), 0.085 if boundary < 45 else 0.12, pan=0.12)
        theme.add(buffer, boundary, bell(2.1), 0.11 if boundary < 45 else 0.15, pan=-0.1)
        theme.add(buffer, boundary, frame_drum(0.65), 0.22, pan=0)

    buffer = theme.add_reverb(buffer, 0.82)
    return master(buffer)


def stats(data: np.ndarray) -> str:
    peak = float(np.max(np.abs(data)))
    rms = float(np.sqrt(np.mean(data * data)))
    return f"duration={len(data) / SAMPLE_RATE:.2f}s peak={peak:.3f} rms={rms:.3f}"


def main() -> None:
    demos = [
        ("cleopatra-theme-a-crown-of-the-nile.wav", render_baseline()),
        ("cleopatra-theme-a2-epic-crown-of-the-nile.wav", render_epic_crown()),
        ("cleopatra-theme-b-war-of-two-lands.wav", render_war_of_two_lands()),
        ("cleopatra-theme-b2-epic-war-of-two-lands.wav", render_war_of_two_lands(epic=True)),
        ("cleopatra-theme-c-ritual-of-isis.wav", render_ritual_of_isis()),
    ]

    for name, data in demos:
        path = OUTPUT_DIR / name
        theme.write_wav(path, data)
        print(f"wrote {path.relative_to(ROOT_DIR)} ({stats(data)})")


if __name__ == "__main__":
    main()
