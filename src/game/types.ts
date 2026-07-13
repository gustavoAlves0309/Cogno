import Phaser from "phaser";

export type GameMode = "title" | "menu" | "real" | "test" | "victory" | "defeat";

export interface ArenaBounds {
  x: number;
  y: number;
  size: number;
}

export interface PlayerState {
  position: Phaser.Math.Vector2;
  radius: number;
  stability: number;
  maxStability: number;
  invulnerableUntil: number;
}

export type AttackCue =
  | "scarab"
  | "nile"
  | "wadjet"
  | "horus"
  | "sands"
  | "maat"
  | "glyph"
  | "army"
  | "phase";

export interface AttackContext {
  scene: Phaser.Scene;
  arena: ArenaBounds;
  player: PlayerState;
  bossPosition: Phaser.Math.Vector2;
  stageWidth: number;
  stageHeight: number;
  playCue?: (cue: AttackCue) => void;
}

export interface Attack {
  readonly name: string;
  update(time: number, delta: number): void;
  collides(player: PlayerState): boolean;
  /**
   * Optional logical damage window. Attacks that expose one can consume the
   * window on first contact even when the player's invulnerability blocks HP
   * loss. Legacy attacks omit it and keep their existing collision behaviour.
   */
  getDamageWindowKey?(): string | null;
  isFinished(): boolean;
  destroy(): void;
}
