import Phaser from "phaser";
import type { ArenaBounds, PlayerState } from "./types";

export class PlayerController {
  readonly state: PlayerState;

  private readonly scene: Phaser.Scene;
  private readonly arena: ArenaBounds;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private dragging = false;

  constructor(scene: Phaser.Scene, arena: ArenaBounds) {
    this.scene = scene;
    this.arena = arena;
    this.state = {
      position: new Phaser.Math.Vector2(arena.x + arena.size / 2, arena.y + arena.size * 0.66),
      radius: 7,
      stability: 3,
      maxStability: 3,
      invulnerableUntil: 0,
    };

    this.graphics = scene.add.graphics().setDepth(60);
    this.bindInput();
    this.draw(0);
  }

  update(time: number): void {
    this.draw(time);
  }

  damage(time: number): boolean {
    if (time < this.state.invulnerableUntil || this.state.stability <= 0) {
      return false;
    }

    this.state.stability -= 1;
    this.state.invulnerableUntil = time + 900;
    this.scene.cameras.main.shake(120, 0.004);
    return true;
  }

  reset(): void {
    this.state.position.set(this.arena.x + this.arena.size / 2, this.arena.y + this.arena.size * 0.66);
    this.state.stability = this.state.maxStability;
    this.state.invulnerableUntil = 0;
    this.draw(0);
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private bindInput(): void {
    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.isPointerInsideArena(pointer)) {
        this.dragging = false;
        return;
      }

      this.dragging = true;
      this.moveToPointer(pointer);
    });

    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging && !pointer.isDown) {
        return;
      }
      this.moveToPointer(pointer);
    });

    this.scene.input.on("pointerup", () => {
      this.dragging = false;
    });

    this.scene.input.on("pointerupoutside", () => {
      this.dragging = false;
    });
  }

  private moveToPointer(pointer: Phaser.Input.Pointer): void {
    const minX = this.arena.x + this.state.radius;
    const maxX = this.arena.x + this.arena.size - this.state.radius;
    const minY = this.arena.y + this.state.radius;
    const maxY = this.arena.y + this.arena.size - this.state.radius;

    this.state.position.set(
      Phaser.Math.Clamp(pointer.worldX, minX, maxX),
      Phaser.Math.Clamp(pointer.worldY, minY, maxY),
    );
  }

  private isPointerInsideArena(pointer: Phaser.Input.Pointer): boolean {
    return (
      pointer.worldX >= this.arena.x &&
      pointer.worldX <= this.arena.x + this.arena.size &&
      pointer.worldY >= this.arena.y &&
      pointer.worldY <= this.arena.y + this.arena.size
    );
  }

  private draw(time: number): void {
    const isInvulnerable = time < this.state.invulnerableUntil;
    const pulse = 0.5 + Math.sin(time * 0.018) * 0.5;
    const alpha = isInvulnerable ? 0.35 + pulse * 0.45 : 1;

    this.graphics.clear();
    this.graphics.fillStyle(0xf8f1d1, alpha);
    this.graphics.fillCircle(this.state.position.x, this.state.position.y, this.state.radius);
    this.graphics.lineStyle(2, 0xffffff, alpha * 0.8);
    this.graphics.strokeCircle(this.state.position.x, this.state.position.y, this.state.radius + 3);
    this.graphics.lineStyle(1, 0x4fe6f1, alpha * 0.35);
    this.graphics.strokeCircle(this.state.position.x, this.state.position.y, this.state.radius + 8 + pulse * 3);
  }
}
