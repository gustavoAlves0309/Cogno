import type { AttackCue } from "../types";

type AudioCue =
  | AttackCue
  | "ui"
  | "damage"
  | "death"
  | "victory";

export type LeonardoCue =
  | "ink"
  | "wing"
  | "bridge"
  | "gear"
  | "pulse"
  | "sfumato";

interface MusicVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  phase: number;
  stopScheduled: boolean;
}

const MUSIC_TRACKS = [
  "/audio/cleopatra-b2-phase1.wav",
  "/audio/cleopatra-b2-phase2.wav",
  "/audio/cleopatra-b2-phase3.wav",
  "/audio/cleopatra-b2-ultimate.wav",
  "/audio/cleopatra-b2-finale.wav",
] as const;
const MUSIC_VOLUME = 0.42;
const MUSIC_FADE_SECONDS = 1.15;

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicPhase = 0;
  private musicBuffers: AudioBuffer[] = [];
  private activeMusicVoice: MusicVoice | null = null;
  private readonly musicVoices = new Set<MusicVoice>();
  private musicLoadPromise: Promise<AudioBuffer[]> | null = null;
  private wantsMusic = false;
  private cueGainActive = false;
  private readonly cueGainMultiplier = 3.15;

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
    this.master.gain.value = 0.78;
    this.master.connect(this.context.destination);
    this.playTone(440, 0.035, "sine", 0, 0.022);

    if (this.wantsMusic) {
      this.startMusic();
    }
  }

  startMusic(): void {
    this.wantsMusic = true;

    if (!this.context || !this.master) {
      return;
    }

    void this.context.resume();
    void this.ensureMusicPlayback();
  }

  stopMusic(): void {
    this.wantsMusic = false;

    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    this.activeMusicVoice = null;
    for (const voice of this.musicVoices) {
      this.fadeOutMusicVoice(voice, now, 0.28);
    }
  }

  playLeonardoCue(cue: LeonardoCue): void {
    if (!this.context || !this.master) {
      return;
    }

    void this.context.resume();
    this.cueGainActive = true;
    try {
      switch (cue) {
        case "ink":
          this.playNoise(0.06, 2800, 0.008);
          this.playTone(470, 0.055, "triangle", 0.018, 0.012);
          this.playTone(620, 0.045, "triangle", 0.072, 0.01);
          break;
        case "wing":
          this.playToneSlide(760, 390, 0.22, "sine", 0, 0.016);
          this.playNoise(0.12, 3600, 0.006, 0.04);
          break;
        case "bridge":
          this.playTone(174, 0.16, "triangle", 0, 0.022);
          this.playTone(261, 0.13, "triangle", 0.08, 0.015);
          break;
        case "gear":
          this.playTone(118, 0.07, "square", 0, 0.012);
          this.playTone(176, 0.07, "square", 0.07, 0.01);
          this.playTone(236, 0.07, "square", 0.14, 0.008);
          break;
        case "pulse":
          this.playTone(92, 0.16, "sine", 0, 0.026);
          this.playTone(184, 0.08, "triangle", 0.075, 0.011);
          break;
        case "sfumato":
          this.playToneSlide(520, 370, 0.28, "sine", 0, 0.012);
          this.playNoise(0.2, 720, 0.005, 0.035);
          break;
      }
    } finally {
      this.cueGainActive = false;
    }
  }

  setPhase(phase: number, restart = false): void {
    const nextPhase = Math.max(0, Math.min(MUSIC_TRACKS.length - 1, Math.floor(phase)));
    if (this.musicPhase === nextPhase && !restart) {
      return;
    }

    this.musicPhase = nextPhase;
    if (this.wantsMusic) {
      void this.ensureMusicPlayback(restart);
    }
  }

  private async ensureMusicPlayback(restart = false): Promise<void> {
    if (!this.context || !this.master) {
      return;
    }

    const buffers = await this.loadMusicBuffers();
    if (!this.context || !this.master || !this.wantsMusic || buffers.length !== MUSIC_TRACKS.length) {
      return;
    }

    const phase = Math.max(0, Math.min(MUSIC_TRACKS.length - 1, Math.floor(this.musicPhase)));
    if (this.activeMusicVoice?.phase === phase && !restart) {
      return;
    }

    this.switchMusicTrack(phase, this.activeMusicVoice ? MUSIC_FADE_SECONDS : 0.18);
  }

  private loadMusicBuffers(): Promise<AudioBuffer[]> {
    if (this.musicBuffers.length === MUSIC_TRACKS.length) {
      return Promise.resolve(this.musicBuffers);
    }

    if (this.musicLoadPromise) {
      return this.musicLoadPromise;
    }

    if (!this.context) {
      return Promise.resolve([]);
    }

    this.musicLoadPromise = Promise.all(
      MUSIC_TRACKS.map(async (track) => {
        try {
          const response = await fetch(track);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.arrayBuffer();
          return this.context!.decodeAudioData(data);
        } catch (error) {
          console.warn(`[GameAudio] Failed to load soundtrack asset: ${track}`, error);
          throw error;
        }
      }),
    ).then((buffers) => {
      this.musicBuffers = buffers;
      return buffers;
    }).catch(() => {
      this.musicLoadPromise = null;
      return [];
    });

    return this.musicLoadPromise;
  }

  private switchMusicTrack(phase: number, fadeSeconds: number): void {
    if (!this.context || !this.master) {
      return;
    }

    const buffer = this.musicBuffers[phase];
    if (!buffer) {
      return;
    }

    const startAt = this.context.currentTime + 0.03;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const outgoing = this.activeMusicVoice;
    const voice: MusicVoice = { source, gain, phase, stopScheduled: false };

    source.buffer = buffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = buffer.duration;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(MUSIC_VOLUME, startAt + fadeSeconds);
    source.connect(gain);
    gain.connect(this.master);
    source.onended = () => this.cleanupMusicVoice(voice);
    source.start(startAt, 0);

    this.musicVoices.add(voice);
    this.activeMusicVoice = voice;

    if (outgoing) {
      this.fadeOutMusicVoice(outgoing, startAt, fadeSeconds);
    }
  }

  private fadeOutMusicVoice(voice: MusicVoice, at: number, fadeSeconds: number): void {
    voice.gain.gain.cancelScheduledValues(at);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), at);
    voice.gain.gain.linearRampToValueAtTime(0.0001, at + fadeSeconds);

    if (voice.stopScheduled) {
      return;
    }

    voice.stopScheduled = true;
    try {
      voice.source.stop(at + fadeSeconds + 0.06);
    } catch {
      this.cleanupMusicVoice(voice);
    }
  }

  private cleanupMusicVoice(voice: MusicVoice): void {
    this.musicVoices.delete(voice);
    if (this.activeMusicVoice === voice) {
      this.activeMusicVoice = null;
    }
    voice.source.disconnect();
    voice.gain.disconnect();
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
          this.playTone(520, 0.055, "triangle", 0, 0.026);
          this.playTone(780, 0.075, "triangle", 0.038, 0.018);
          break;
        case "scarab":
          this.playTone(520, 0.035, "sawtooth", 0, 0.022);
          this.playTone(760, 0.028, "square", 0.035, 0.016);
          this.playTone(1040, 0.026, "triangle", 0.07, 0.012);
          this.playNoise(0.065, 2600, 0.012, 0.018);
          break;
        case "nile":
          this.playTone(116, 0.36, "sine", 0, 0.034);
          this.playNoise(0.42, 420, 0.038, 0.02);
          this.playNoise(0.24, 1050, 0.024, 0.08);
          break;
        case "wadjet":
          this.playNoise(0.22, 3300, 0.035);
          this.playToneSlide(260, 145, 0.18, "sawtooth", 0.045, 0.026);
          this.playTone(840, 0.045, "square", 0.115, 0.012);
          break;
        case "horus":
          this.playTone(330, 0.18, "triangle", 0, 0.03);
          this.playTone(660, 0.21, "sine", 0.045, 0.026);
          this.playTone(990, 0.1, "triangle", 0.13, 0.018);
          this.playNoise(0.08, 4200, 0.01, 0.04);
          break;
        case "sands":
          this.playToneSlide(920, 430, 0.34, "triangle", 0, 0.026);
          this.playTone(660, 0.12, "sine", 0.09, 0.018);
          this.playTone(330, 0.22, "sine", 0.22, 0.026);
          this.playNoise(0.42, 1850, 0.026, 0.045);
          break;
        case "maat":
          this.playTone(370, 0.14, "triangle", 0, 0.032);
          this.playTone(555, 0.16, "triangle", 0.075, 0.028);
          this.playTone(1110, 0.1, "sine", 0.14, 0.018);
          this.playTone(108, 0.32, "sawtooth", 0.58, 0.048);
          this.playNoise(0.18, 620, 0.034, 0.62);
          break;
        case "glyph":
          this.playTone(392, 0.11, "sine", 0, 0.022);
          this.playTone(587.33, 0.11, "triangle", 0.095, 0.021);
          this.playTone(783.99, 0.13, "sine", 0.19, 0.019);
          this.playTone(1174.66, 0.12, "triangle", 0.29, 0.014);
          this.playNoise(0.18, 3600, 0.014, 0.1);
          break;
        case "army":
          this.playTone(130.81, 0.46, "sine", 0, 0.04);
          this.playTone(261.63, 0.24, "triangle", 0.08, 0.03);
          this.playTone(392, 0.22, "triangle", 0.16, 0.024);
          this.playTone(783.99, 0.14, "sine", 0.31, 0.016);
          this.playNoise(0.46, 2400, 0.024, 0.035);
          this.playNoise(0.16, 820, 0.036, 0.62);
          break;
        case "damage":
          this.playToneSlide(190, 95, 0.14, "sawtooth", 0, 0.044);
          this.playNoise(0.09, 900, 0.028);
          break;
        case "death":
          this.playToneSlide(240, 84, 0.46, "sawtooth", 0, 0.052);
          this.playTone(96, 0.58, "sine", 0.08, 0.06);
          this.playNoise(0.38, 1400, 0.052);
          break;
        case "victory":
          this.playTone(392, 0.14, "triangle", 0, 0.04);
          this.playTone(523.25, 0.16, "triangle", 0.115, 0.038);
          this.playTone(659.25, 0.18, "triangle", 0.24, 0.034);
          this.playTone(783.99, 0.42, "sine", 0.38, 0.034);
          break;
        case "phase":
          this.playTone(196, 0.12, "sine", 0, 0.036);
          this.playTone(392 + this.musicPhase * 72, 0.2, "triangle", 0.08, 0.034);
          this.playNoise(0.11, 1800 + this.musicPhase * 280, 0.018, 0.04);
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

  private playToneSlide(
    startFrequency: number,
    endFrequency: number,
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
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    const outputGain = gainValue * (this.cueGainActive ? this.cueGainMultiplier : 1);
    gain.gain.exponentialRampToValueAtTime(outputGain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.04);
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
}
