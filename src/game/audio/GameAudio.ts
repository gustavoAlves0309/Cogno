import type { AttackCue } from "../types";

type AudioCue =
  | AttackCue
  | "ui"
  | "damage"
  | "death"
  | "victory";

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicPhase = 0;
  private musicStep = 0;
  private wantsMusic = false;
  private cueGainActive = false;
  private readonly cueGainMultiplier = 2.8;

  unlock(): void {
    if (this.context) {
      void this.context.resume();
      return;
    }

    const AudioContextCtor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    this.context = new AudioContextCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 0.72;
    this.master.connect(this.context.destination);
    this.playTone(440, 0.035, "sine", 0, 0.03);

    if (this.wantsMusic) {
      this.startMusic();
    }
  }

  startMusic(): void {
    this.wantsMusic = true;

    if (!this.context || !this.master || this.musicTimer !== null) {
      return;
    }

    void this.context.resume();
    this.musicStep = 0;

    this.musicTimer = window.setInterval(() => {
      this.playMusicStep();
    }, 230);
  }

  stopMusic(): void {
    this.wantsMusic = false;

    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setPhase(phase: number): void {
    this.musicPhase = phase;
  }

  private playMusicStep(): void {
    const phase = Math.max(0, Math.min(3, Math.floor(this.musicPhase)));
    const step = this.musicStep % 32;
    const bar = Math.floor(step / 8);
    const roots = [
      [98, 87.31, 110, 92.5],
      [110, 98, 123.47, 87.31],
      [123.47, 110, 98, 146.83],
      [130.81, 123.47, 146.83, 110],
    ];
    const root = roots[phase][bar] ?? roots[0][0];
    const bassPattern = [1, 0, 1.5, 0, 1.25, 0, 1.5, 0];
    const melodyPatterns = [
      [2, 0, 2.5, 0, 2.25, 0, 3, 0, 2, 0, 2.5, 3, 0, 2.25, 0, 1.5],
      [2, 0, 2.25, 2.5, 0, 3, 0, 2.5, 1.5, 0, 2, 0, 2.25, 0, 3, 0],
      [2.5, 0, 3, 0, 2.25, 2, 0, 1.5, 2, 0, 2.5, 0, 3, 3.75, 0, 2],
      [3, 0, 2.5, 3.75, 0, 2.25, 3, 0, 2.5, 3, 0, 4, 2.25, 0, 3.75, 0],
    ];
    const bass = bassPattern[step % bassPattern.length];
    const melody = melodyPatterns[phase][step % 16];
    const phraseAccent = Math.floor(this.musicStep / 32) % 4;

    if (step % 8 === 0) {
      this.playMusicTone(root * 0.5, 1.7, "sine", 0, 0.04 + phase * 0.006);
      this.playMusicTone(root, 0.42, "triangle", 0.015, 0.056 + phase * 0.006);
    } else if (bass > 0 && step % 2 === 0) {
      this.playMusicTone(root * bass, 0.16, "triangle", 0, 0.035 + phase * 0.004);
    }

    if (melody > 0 && (step + phraseAccent) % (phase >= 2 ? 2 : 3) !== 1) {
      const variation = phraseAccent === 3 && step > 20 ? 1.122 : 1;
      this.playMusicTone(root * melody * variation, 0.11, "triangle", 0.025, 0.026 + phase * 0.004);
    }

    if (step % 8 === 0 || (phase >= 3 && step % 4 === 0)) {
      this.playMusicNoise(0.055, 720 + phase * 140, 0.022 + phase * 0.004);
    }

    if (step % 8 === 4) {
      this.playMusicNoise(0.07, 2200 + phase * 360, 0.018 + phase * 0.003);
      this.playMusicTone(root * 2.01, 0.09, "sine", 0.018, 0.022);
    }

    if (phase >= 2 && step % 16 === 14) {
      this.playMusicTone(root * 3.75, 0.14, "triangle", 0, 0.025);
      this.playMusicTone(root * 5, 0.1, "sine", 0.08, 0.018);
    }

    this.musicStep += 1;
  }

  playCue(cue: AudioCue): void {
    if (!this.context || !this.master) {
      return;
    }

    void this.context.resume();

    this.cueGainActive = true;
    try {
      switch (cue) {
        case "ui":
          this.playTone(520, 0.06, "triangle", 0, 0.035);
          this.playTone(780, 0.08, "triangle", 0.04, 0.025);
          break;
        case "scarab":
          this.playTone(720, 0.05, "sawtooth", 0, 0.025);
          this.playTone(960, 0.04, "square", 0.035, 0.018);
          break;
        case "nile":
          this.playNoise(0.36, 720, 0.055);
          this.playTone(160, 0.24, "sine", 0, 0.04);
          break;
        case "wadjet":
          this.playNoise(0.18, 2800, 0.035);
          this.playTone(220, 0.18, "sawtooth", 0.03, 0.025);
          break;
        case "horus":
          this.playTone(330, 0.16, "triangle", 0, 0.035);
          this.playTone(660, 0.2, "sine", 0.05, 0.03);
          this.playTone(990, 0.08, "triangle", 0.13, 0.02);
          break;
        case "sands":
          this.playTone(880, 0.08, "triangle", 0, 0.025);
          this.playTone(660, 0.1, "triangle", 0.07, 0.026);
          this.playTone(440, 0.18, "sine", 0.16, 0.032);
          this.playNoise(0.34, 1900, 0.028, 0.06);
          break;
        case "maat":
          this.playTone(740, 0.09, "triangle", 0, 0.034);
          this.playTone(1110, 0.08, "sine", 0.09, 0.024);
          this.playTone(120, 0.28, "sawtooth", 0.78, 0.055);
          this.playNoise(0.18, 620, 0.04, 0.8);
          break;
        case "glyph":
          this.playTone(523.25, 0.1, "sine", 0, 0.026);
          this.playTone(783.99, 0.1, "triangle", 0.12, 0.024);
          this.playTone(1046.5, 0.16, "sine", 0.27, 0.022);
          this.playNoise(0.16, 3200, 0.018, 0.12);
          break;
        case "army":
          this.playTone(174.61, 0.34, "sine", 0, 0.04);
          this.playTone(349.23, 0.18, "triangle", 0.08, 0.03);
          this.playTone(698.46, 0.12, "triangle", 0.22, 0.022);
          this.playNoise(0.42, 2400, 0.026, 0.04);
          this.playNoise(0.16, 900, 0.04, 0.78);
          break;
        case "damage":
          this.playTone(120, 0.12, "sawtooth", 0, 0.055);
          this.playNoise(0.09, 900, 0.035);
          break;
        case "death":
          this.playTone(240, 0.18, "sawtooth", 0, 0.06);
          this.playTone(96, 0.5, "sine", 0.08, 0.07);
          this.playNoise(0.38, 1400, 0.065);
          break;
        case "victory":
          this.playTone(392, 0.16, "triangle", 0, 0.05);
          this.playTone(523.25, 0.18, "triangle", 0.12, 0.045);
          this.playTone(783.99, 0.42, "sine", 0.28, 0.04);
          break;
        case "phase":
          this.playTone(196, 0.11, "sine", 0, 0.045);
          this.playTone(392 + this.musicPhase * 72, 0.22, "triangle", 0.08, 0.04);
          break;
      }
    } finally {
      this.cueGainActive = false;
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    delay: number,
    gainValue: number,
  ): void {
    if (!this.context || !this.master) {
      return;
    }

    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    const outputGain = gainValue * (this.cueGainActive ? this.cueGainMultiplier : 1);
    gain.gain.exponentialRampToValueAtTime(outputGain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
  }

  private playMusicTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    delay: number,
    gainValue: number,
  ): void {
    const wasCueGainActive = this.cueGainActive;
    this.cueGainActive = false;
    try {
      this.playTone(frequency, duration, type, delay, gainValue);
    } finally {
      this.cueGainActive = wasCueGainActive;
    }
  }

  private playNoise(duration: number, cutoff: number, gainValue: number, delay = 0): void {
    if (!this.context || !this.master) {
      return;
    }

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    filter.type = "bandpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 2.2;
    gain.gain.setValueAtTime(0.0001, now);
    const outputGain = gainValue * (this.cueGainActive ? this.cueGainMultiplier : 1);
    gain.gain.exponentialRampToValueAtTime(outputGain, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  private playMusicNoise(duration: number, cutoff: number, gainValue: number, delay = 0): void {
    const wasCueGainActive = this.cueGainActive;
    this.cueGainActive = false;
    try {
      this.playNoise(duration, cutoff, gainValue, delay);
    } finally {
      this.cueGainActive = wasCueGainActive;
    }
  }
}
