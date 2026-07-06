import Phaser from "phaser";

export type GameMode = "menu" | "real" | "test" | "victory" | "defeat";

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

export interface AttackContext {
  scene: Phaser.Scene;
  arena: ArenaBounds;
  player: PlayerState;
  bossPosition: Phaser.Math.Vector2;
  stageWidth: number;
  stageHeight: number;
}

export interface Attack {
  readonly name: string;
  update(time: number, delta: number): void;
  collides(player: PlayerState): boolean;
  isFinished(): boolean;
  destroy(): void;
}
