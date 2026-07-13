import Phaser from "phaser";
import {
  playerMaxSpeedForArena,
  playerRadiusForArena,
} from "./mechanics/leonardoPerspectiveGeometry";
import { drawPlayerVisuals, type PlayerVisualState } from "./rendering/PlayerVisuals";
import type { ArenaBounds, PlayerState } from "./types";

export class PlayerController {
  readonly state: PlayerState;

  private readonly scene: Phaser.Scene;
  private readonly arena: ArenaBounds;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly joystickGraphics: Phaser.GameObjects.Graphics;
  private readonly controlVector = new Phaser.Math.Vector2(0, 0);
  private readonly visualDirection = new Phaser.Math.Vector2(0, -1);
  private readonly visualState: PlayerVisualState;
  private controlsEnabled = false;
  private playerVisible = true;
  private activePointerId: number | null = null;
  private controlStrength = 0;
  private joystickX = 0;
  private joystickY = 0;
  private joystickRadius = 42;
  private joystickHomeX = 0;
  private joystickHomeY = 0;
  private controlZone = new Phaser.Geom.Rectangle(0, 0, 0, 0);
  private lastDamageAt = Number.NEGATIVE_INFINITY;

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
    this.visualState = {
      time: 0,
      x: this.state.position.x,
      y: this.state.position.y,
      radius: this.state.radius,
      directionX: 0,
      directionY: -1,
      movementStrength: 0,
      invulnerable: false,
      hitAge: Number.POSITIVE_INFINITY,
    };

    this.graphics = scene.add.graphics().setDepth(60);
    this.joystickGraphics = scene.add.graphics().setDepth(86);
    this.bindInput();
    this.draw(0);
  }

  update(time: number, delta: number): void {
    this.refreshRadius();
    this.updateVisualDirection(delta);
    this.move(delta);
    this.draw(time);
    this.drawJoystick();
  }

  damage(time: number): boolean {
    if (time < this.state.invulnerableUntil || this.state.stability <= 0) {
      return false;
    }

    this.state.stability -= 1;
    this.state.invulnerableUntil = time + 900;
    this.lastDamageAt = time;
    this.scene.cameras.main.shake(120, 0.004);
    return true;
  }

  restoreStability(time: number, invulnerabilityMs = 700): void {
    this.state.stability = this.state.maxStability;
    this.state.invulnerableUntil = Math.max(
      this.state.invulnerableUntil,
      time + invulnerabilityMs,
    );
  }

  reset(): void {
    this.refreshRadius();
    this.releaseJoystick();
    this.state.position.set(this.arena.x + this.arena.size / 2, this.arena.y + this.arena.size * 0.66);
    this.state.stability = this.state.maxStability;
    this.state.invulnerableUntil = 0;
    this.lastDamageAt = Number.NEGATIVE_INFINITY;
    this.visualDirection.set(0, -1);
    this.draw(0);
  }

  setVisible(visible: boolean): void {
    this.playerVisible = visible;
    this.graphics.setVisible(visible);
    this.joystickGraphics.setVisible(visible && this.controlsEnabled);
  }

  setControlEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    this.joystickGraphics.setVisible(enabled && this.playerVisible);

    if (!enabled) {
      this.releaseJoystick();
    }
  }

  setJoystickLayout(x: number, y: number, radius: number): void {
    this.joystickX = x;
    this.joystickY = y;
    this.joystickHomeX = x;
    this.joystickHomeY = y;
    this.joystickRadius = radius;
  }

  setControlZone(x: number, y: number, width: number, height: number): void {
    this.controlZone.setTo(x, y, width, height);
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.handlePointerDown, this);
    this.scene.input.off("pointermove", this.handlePointerMove, this);
    this.scene.input.off("pointerup", this.handlePointerUp, this);
    this.scene.input.off("pointerupoutside", this.handlePointerUp, this);
    this.releaseJoystick();
    this.graphics.destroy();
    this.joystickGraphics.destroy();
  }

  private bindInput(): void {
    this.scene.input.on("pointerdown", this.handlePointerDown, this);
    this.scene.input.on("pointermove", this.handlePointerMove, this);
    this.scene.input.on("pointerup", this.handlePointerUp, this);
    this.scene.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.controlsEnabled || !this.isPointerInsideJoystick(pointer)) {
      return;
    }

    this.activePointerId = pointer.id;
    this.joystickX = Phaser.Math.Clamp(
      pointer.worldX,
      this.controlZone.x + this.joystickRadius,
      this.controlZone.right - this.joystickRadius,
    );
    this.joystickY = Phaser.Math.Clamp(
      pointer.worldY,
      this.controlZone.y + this.joystickRadius,
      this.controlZone.bottom - this.joystickRadius,
    );
    this.updateJoystick(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId === pointer.id) {
      this.updateJoystick(pointer);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.activePointerId === pointer.id) {
      this.releaseJoystick();
    }
  }

  private refreshRadius(): void {
    this.state.radius = playerRadiusForArena(this.arena.size);
  }

  private move(delta: number): void {
    if (!this.controlsEnabled || this.controlStrength <= 0 || this.controlVector.lengthSq() === 0) {
      return;
    }

    const speed = playerMaxSpeedForArena(this.arena.size);
    const step = speed * this.controlStrength * (delta / 1000);
    this.state.position.x += this.controlVector.x * step;
    this.state.position.y += this.controlVector.y * step;
    this.clampToArena();
  }

  private updateVisualDirection(delta: number): void {
    if (this.controlStrength <= 0.02 || this.controlVector.lengthSq() === 0) {
      return;
    }

    const follow = Phaser.Math.Clamp(delta / 85, 0, 1);
    this.visualDirection.lerp(this.controlVector, follow).normalize();
  }

  private clampToArena(): void {
    const minX = this.arena.x + this.state.radius;
    const maxX = this.arena.x + this.arena.size - this.state.radius;
    const minY = this.arena.y + this.state.radius;
    const maxY = this.arena.y + this.arena.size - this.state.radius;

    this.state.position.set(
      Phaser.Math.Clamp(this.state.position.x, minX, maxX),
      Phaser.Math.Clamp(this.state.position.y, minY, maxY),
    );
  }

  private isPointerInsideJoystick(pointer: Phaser.Input.Pointer): boolean {
    return Phaser.Geom.Rectangle.Contains(this.controlZone, pointer.worldX, pointer.worldY);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.worldX - this.joystickX;
    const dy = pointer.worldY - this.joystickY;
    const distance = Math.hypot(dx, dy);

    if (distance <= 2) {
      this.controlVector.set(0, 0);
      this.controlStrength = 0;
      return;
    }

    const dirX = dx / distance;
    const dirY = dy / distance;

    if (distance > this.joystickRadius) {
      const follow = distance - this.joystickRadius;
      this.joystickX = Phaser.Math.Clamp(
        this.joystickX + dirX * follow,
        this.controlZone.x + this.joystickRadius,
        this.controlZone.right - this.joystickRadius,
      );
      this.joystickY = Phaser.Math.Clamp(
        this.joystickY + dirY * follow,
        this.controlZone.y + this.joystickRadius,
        this.controlZone.bottom - this.joystickRadius,
      );
    }

    const adjustedDx = pointer.worldX - this.joystickX;
    const adjustedDy = pointer.worldY - this.joystickY;
    const adjustedDistance = Math.hypot(adjustedDx, adjustedDy);

    if (adjustedDistance <= 2) {
      this.controlVector.set(0, 0);
      this.controlStrength = 0;
      return;
    }

    this.controlVector.set(adjustedDx / adjustedDistance, adjustedDy / adjustedDistance);
    this.controlStrength = Phaser.Math.Clamp(adjustedDistance / (this.joystickRadius * 0.82), 0, 1);
  }

  private releaseJoystick(): void {
    this.activePointerId = null;
    this.controlVector.set(0, 0);
    this.controlStrength = 0;
    this.joystickX = this.joystickHomeX;
    this.joystickY = this.joystickHomeY;
  }

  private draw(time: number): void {
    if (!this.playerVisible) {
      this.graphics.clear();
      return;
    }

    this.visualState.time = time;
    this.visualState.x = this.state.position.x;
    this.visualState.y = this.state.position.y;
    this.visualState.radius = this.state.radius;
    this.visualState.directionX = this.visualDirection.x;
    this.visualState.directionY = this.visualDirection.y;
    this.visualState.movementStrength = this.controlsEnabled ? this.controlStrength : 0;
    this.visualState.invulnerable = time < this.state.invulnerableUntil;
    this.visualState.hitAge = time - this.lastDamageAt;
    drawPlayerVisuals(this.graphics, this.visualState);
  }

  private drawJoystick(): void {
    this.joystickGraphics.clear();

    if (!this.controlsEnabled || !this.playerVisible) {
      return;
    }

    this.joystickGraphics.fillStyle(0x07121a, this.activePointerId === null ? 0.16 : 0.28);
    this.joystickGraphics.fillRoundedRect(
      this.controlZone.x + 10,
      this.controlZone.y + 6,
      Math.max(0, this.controlZone.width - 20),
      Math.max(0, this.controlZone.height - 12),
      10,
    );

    if (this.activePointerId === null) {
      return;
    }

    const knobDistance = this.joystickRadius * 0.58 * this.controlStrength;
    const knobX = this.joystickX + this.controlVector.x * knobDistance;
    const knobY = this.joystickY + this.controlVector.y * knobDistance;

    this.joystickGraphics.fillStyle(0x061018, 0.7);
    this.joystickGraphics.fillCircle(this.joystickX, this.joystickY, this.joystickRadius * 1.16);
    this.joystickGraphics.lineStyle(2, 0xd8b65d, 0.72);
    this.joystickGraphics.strokeCircle(this.joystickX, this.joystickY, this.joystickRadius);
    this.joystickGraphics.lineStyle(1, 0x42d6d2, 0.42);
    this.joystickGraphics.strokeCircle(this.joystickX, this.joystickY, this.joystickRadius * 0.62);

    if (this.controlStrength > 0) {
      this.joystickGraphics.lineStyle(3, 0xf0d58a, 0.48);
      this.joystickGraphics.lineBetween(this.joystickX, this.joystickY, knobX, knobY);
    }

    this.joystickGraphics.fillStyle(0xf8f1d1, 0.92);
    this.joystickGraphics.fillCircle(knobX, knobY, this.joystickRadius * 0.31);
    this.joystickGraphics.lineStyle(2, 0x42d6d2, 0.7);
    this.joystickGraphics.strokeCircle(knobX, knobY, this.joystickRadius * 0.35);
  }
}
