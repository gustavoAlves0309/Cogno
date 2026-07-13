from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np


SAMPLE_RATE = 22_050
BPM = 132
BARS = 16
BEAT = 60 / BPM
DURATION = BARS * 4 * BEAT
ROOTS = [98.0, 98.0, 87.31, 110.0]
HIJAZ_INTERVALS = [0, 1, 4, 5, 7, 8, 10]
RNG = np.random.default_rng(1947)


def envelope(length: int, attack: float, decay: float, sustain: float, release: float) -> np.ndarray:
    env = np.ones(length, dtype=np.float32) * sustain
    attack_samples = max(1, int(attack * SAMPLE_RATE))
    decay_samples = max(1, int(decay * SAMPLE_RATE))
    release_samples = max(1, int(release * SAMPLE_RATE))

    env[:attack_samples] = np.linspace(0, 1, attack_samples, dtype=np.float32)
    decay_end = min(length, attack_samples + decay_samples)
    env[attack_samples:decay_end] = np.linspace(1, sustain, decay_end - attack_samples, dtype=np.float32)

    release_start = max(0, length - release_samples)
    env[release_start:] *= np.linspace(1, 0, length - release_start, dtype=np.float32)
    return env


def pan_stereo(signal: np.ndarray, pan: float) -> np.ndarray:
    angle = (pan + 1) * math.pi / 4
    return np.column_stack((signal * math.cos(angle), signal * math.sin(angle))).astype(np.float32)


def add(buffer: np.ndarray, start: float, signal: np.ndarray, gain: float, pan: float = 0) -> None:
    start_index = int(start * SAMPLE_RATE)
    if start_index >= len(buffer):
        return

    end_index = min(len(buffer), start_index + len(signal))
    if end_index <= start_index:
        return

    stereo = pan_stereo(signal[: end_index - start_index] * gain, pan)
    buffer[start_index:end_index] += stereo


def hijaz(root: float, degree: int, octave: int = 0) -> float:
    wrapped = degree % len(HIJAZ_INTERVALS)
    octave_shift = degree // len(HIJAZ_INTERVALS) + octave
    return root * (2 ** (octave_shift + HIJAZ_INTERVALS[wrapped] / 12))


def tone(freq: float, seconds: float, harmonics: tuple[float, ...], vibrato=0.0, attack=0.01, release=0.08) -> np.ndarray:
    length = max(1, int(seconds * SAMPLE_RATE))
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    vib = 1 + np.sin(2 * np.pi * 5.3 * t) * vibrato
    phase = 2 * np.pi * freq * np.cumsum(vib) / SAMPLE_RATE
    signal = np.zeros(length, dtype=np.float32)

    for harmonic, weight in enumerate(harmonics, start=1):
        signal += np.sin(phase * harmonic) * weight

    max_abs = np.max(np.abs(signal)) or 1
    signal = signal / max_abs
    return signal * envelope(length, attack, seconds * 0.18, 0.72, release)


def pluck(freq: float, seconds: float) -> np.ndarray:
    length = max(1, int(seconds * SAMPLE_RATE))
    period = max(2, int(SAMPLE_RATE / freq))
    source = RNG.uniform(-1, 1, period).astype(np.float32)
    output = np.zeros(length, dtype=np.float32)
    damping = 0.996

    for index in range(length):
        output[index] = source[index % period]
        source[index % period] = damping * 0.5 * (source[index % period] + source[(index + 1) % period])

    return output * envelope(length, 0.002, 0.05, 0.22, seconds * 0.7)


def drum_dum(seconds=0.34) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    freq = 92 * np.exp(-t * 15) + 42
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    body = np.sin(phase) * np.exp(-t * 6.2)
    noise = RNG.uniform(-1, 1, length).astype(np.float32) * np.exp(-t * 24)
    return (body + noise * 0.18).astype(np.float32)


def drum_tek(seconds=0.09) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    noise = RNG.uniform(-1, 1, length).astype(np.float32)
    ring = np.sin(2 * np.pi * 3100 * t) + np.sin(2 * np.pi * 4700 * t) * 0.5
    return (noise * 0.55 + ring * 0.45) * np.exp(-t * 38)


def sistrum(seconds=0.42) -> np.ndarray:
    length = int(seconds * SAMPLE_RATE)
    t = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    signal = RNG.uniform(-1, 1, length).astype(np.float32) * 0.12
    for freq in (3320, 4180, 5290, 6760, 7810):
        signal += np.sin(2 * np.pi * freq * t + RNG.random() * 2 * np.pi) * 0.16
    return signal * np.exp(-t * 5.6)


def add_reverb(buffer: np.ndarray, wet: float) -> np.ndarray:
    result = buffer.copy()
    for delay, decay, pan in ((0.067, 0.22, -0.35), (0.113, 0.18, 0.4), (0.173, 0.14, -0.1), (0.241, 0.1, 0.18)):
        offset = int(delay * SAMPLE_RATE)
        delayed = np.zeros_like(buffer)
        delayed[offset:] = buffer[:-offset] * decay
        delayed[:, 0] *= 1 - max(0, pan) * 0.35
        delayed[:, 1] *= 1 + max(0, pan) * 0.35
        result += delayed * wet
    return result


def add_pad(buffer: np.ndarray, bar_start: float, root: float, phase: int) -> None:
    length = BEAT * 4.3
    gain = 0.052 + phase * 0.012
    notes = (hijaz(root, 0, -1), hijaz(root, 4, -1), hijaz(root, 0, 0))
    for index, freq in enumerate(notes):
        signal = tone(freq, length, (1, 0.24, 0.13, 0.07), vibrato=0.003, attack=0.25, release=0.6)
        add(buffer, bar_start, signal, gain * (0.9 - index * 0.12), pan=-0.45 + index * 0.45)


def add_choir(buffer: np.ndarray, bar_start: float, root: float, phase: int) -> None:
    if phase < 2:
        return

    length = BEAT * 4.15
    gain = 0.034 + phase * 0.009
    for degree, pan in ((0, -0.25), (2, 0.22), (4, 0.05)):
        signal = tone(hijaz(root, degree, 0), length, (1, 0.55, 0.12, 0.08, 0.05), vibrato=0.002, attack=0.38, release=0.7)
        add(buffer, bar_start + 0.03, signal, gain, pan)


def add_brass_hit(buffer: np.ndarray, start: float, root: float, phase: int) -> None:
    if phase < 1:
        return

    length = 0.9 + phase * 0.13
    gain = 0.05 + phase * 0.012
    for degree, pan in ((0, -0.3), (4, 0.3), (7, 0.0)):
        signal = tone(hijaz(root, degree, 0), length, (1, 0.62, 0.38, 0.22, 0.12), vibrato=0.001, attack=0.035, release=0.38)
        add(buffer, start, signal, gain, pan)


def add_nay_phrase(buffer: np.ndarray, start: float, root: float, phase: int, phrase: list[int]) -> None:
    note_len = BEAT * (0.72 if phase < 2 else 0.58)
    for index, degree in enumerate(phrase):
        freq = hijaz(root, degree, 2)
        signal = tone(freq, note_len, (1, 0.18, 0.06), vibrato=0.008, attack=0.04, release=0.16)
        breath = RNG.uniform(-1, 1, len(signal)).astype(np.float32) * envelope(len(signal), 0.02, 0.05, 0.35, 0.1)
        add(buffer, start + index * note_len * 0.82, signal + breath * 0.055, 0.04 + phase * 0.006, pan=-0.18)


def render_phase(phase: int) -> np.ndarray:
    buffer = np.zeros((int(DURATION * SAMPLE_RATE), 2), dtype=np.float32)
    intensity = phase + 1
    motif_a = [0, 1, 2, 4, 3, 2, 1, 0]
    motif_b = [4, 5, 4, 2, 1, 0, -1, 0]
    ostinato = [0, 4, 3, 4, 1, 4, 3, 4, 0, 4, 5, 4, 2, 4, 3, 1]

    for bar in range(BARS):
        root = ROOTS[bar % len(ROOTS)]
        bar_start = bar * BEAT * 4
        add_pad(buffer, bar_start, root, phase)
        add_choir(buffer, bar_start, root, phase)

        if bar % 4 == 0 or phase >= 2 or phase >= 4:
            add_brass_hit(buffer, bar_start, root, phase)
        if phase >= 4 and bar % 2 == 1:
            add_brass_hit(buffer, bar_start + BEAT * 2, root, phase)

        dum_beats = [0, 1.5, 2, 3.5]
        if phase >= 4:
            dum_beats += [0.5, 2.75]
        for beat in dum_beats:
            if beat in (1.5, 3.5) and phase == 0:
                continue
            add(buffer, bar_start + beat * BEAT, drum_dum(), 0.19 + intensity * 0.018, pan=-0.05)

        taks = [1, 2.5, 3]
        if phase >= 1:
            taks += [0.75, 1.75, 3.75]
        if phase >= 3:
            taks += [0.25, 1.25, 2.25, 3.25]
        if phase >= 4:
            taks += [0.5, 1.5, 2.75, 3.5]
        for beat in taks:
            add(buffer, bar_start + beat * BEAT, drum_tek(), 0.09 + intensity * 0.01, pan=0.32 if beat % 1 else -0.28)

        if bar % 4 == 3:
            add(buffer, bar_start + BEAT * 3.48, sistrum(0.55), 0.07 + phase * 0.014, pan=0.34)

        subdivision = 0.5 if phase < 2 else 0.25
        steps = int(4 / subdivision)
        for step in range(steps):
            if phase == 0 and step % 2 == 1:
                continue
            degree = ostinato[(bar * steps + step) % len(ostinato)]
            octave = 1 if phase >= 2 else 0
            signal = pluck(hijaz(root, degree, octave), 0.72)
            pan = -0.42 if step % 2 == 0 else 0.42
            add(buffer, bar_start + step * subdivision * BEAT, signal, 0.034 + phase * 0.006, pan)

        if bar % 4 in (1, 3) or phase >= 2:
            phrase = motif_a if (bar // 2) % 2 == 0 else motif_b
            add_nay_phrase(buffer, bar_start + BEAT * 0.18, root, phase, phrase)
        if phase >= 4 and bar % 2 == 0:
            add_nay_phrase(buffer, bar_start + BEAT * 2.06, root, phase, [7, 6, 5, 4])

        if phase >= 2 and bar % 2 == 1:
            low_signal = tone(hijaz(root, 0, -1), BEAT * 1.1, (1, 0.34, 0.2), vibrato=0.001, attack=0.02, release=0.28)
            add(buffer, bar_start + BEAT * 3.0, low_signal, 0.08 + phase * 0.012, 0)
        if phase >= 4:
            choir_stab = tone(hijaz(root, 7, 0), BEAT * 0.9, (1, 0.5, 0.26, 0.13), vibrato=0.001, attack=0.03, release=0.22)
            add(buffer, bar_start + BEAT * 1.98, choir_stab, 0.085, pan=0.12)

    if phase >= 3:
        for bar in range(0, BARS, 2):
            start = bar * BEAT * 4 + BEAT * 3.72
            add(buffer, start, sistrum(0.34), 0.13, pan=-0.15)
    if phase >= 4:
        for bar in range(BARS):
            start = bar * BEAT * 4 + BEAT * 3.36
            add(buffer, start, sistrum(0.48), 0.18, pan=0.22 if bar % 2 else -0.22)

    buffer = add_reverb(buffer, 0.75)
    buffer = np.tanh(buffer * 1.65)
    peak = np.max(np.abs(buffer)) or 1
    return (buffer / peak * 0.88).astype(np.float32)


def write_wav(path: Path, data: np.ndarray) -> None:
    pcm = np.clip(data, -1, 1)
    pcm_i16 = (pcm * 32767).astype("<i2")
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm_i16.tobytes())


def main() -> None:
    output_dir = Path("public/audio")
    names = [
        "cleopatra-boss-phase1.wav",
        "cleopatra-boss-phase2.wav",
        "cleopatra-boss-phase3.wav",
        "cleopatra-boss-ultimate.wav",
        "cleopatra-boss-finale.wav",
    ]
    for phase, name in enumerate(names):
        write_wav(output_dir / name, render_phase(phase))
        print(f"wrote {output_dir / name}")


if __name__ == "__main__":
    main()
