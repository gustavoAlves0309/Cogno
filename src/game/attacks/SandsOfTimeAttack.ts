import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
import {
  HORUS_ACTIVE_RAY_STRIDE,
  HORUS_RAY_COUNT,
  HORUS_RAY_LENGTH,
  drawHorusEye,
  drawHorusRays,
  type HorusRayVisual,
} from "../rendering/HorusVisuals";
import { drawScarabBody, drawScarabTrail, drawScarabWindup } from "../rendering/ScarabVisuals";
import type { ScarabRewindTrajectory } from "./ScarabVolleyAttack";
import type { Attack, AttackContext, PlayerState } from "../types";

export interface SandsRewindSnapshot {
  scarabs?: ScarabRewindTrajectory[];
  horus?: boolean;
}

interface RewindScarab {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  position: Phaser.Math.Vector2;
  delay: number;
  travelMs: number;
}

interface RewindRay extends HorusRayVisual {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  state: "memory" | "telegraph" | "active" | "fade";
}

export class SandsOfTimeAttack implements Attack {
  readonly name = "Sands of Time";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly hasHorusRewind: boolean;
  private startedAt: number | null = null;
  private readonly telegraphMs = 1120;
  private readonly horusDurationMs = 8600;
  private readonly lingerMs = 460;
  private readonly scarabWindupMs = 820;
  private readonly scarabs: RewindScarab[] = [];
  private readonly rays: RewindRay[] = [];
  private readonly rayCenter: Phaser.Math.Vector2;
  private age = 0;
  private active = false;

  constructor(context: AttackContext, _time: number, snapshot: SandsRewindSnapshot) {
    this.context = context;
    this.hasHorusRewind = snapshot.horus === true;
    this.graphics = context.scene.add.graphics().setDepth(58);
    this.rayCenter = this.getHourglassCenter();
    if (snapshot.scarabs?.length) {
      this.createScarabEchoes(snapshot.scarabs);
    }
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    this.age = time - this.startedAt;
    this.active = this.age >= this.telegraphMs && this.age <= this.telegraphMs + this.getActiveMs();

    if (this.scarabs.length > 0) {
      this.updateScarabs();
    }

    if (this.hasHorusRewind) {
      this.updateHorusRays();
    }

    this.draw();
  }

  collides(player: PlayerState): boolean {
    if (!this.active) {
      return false;
    }

    const hitsScarab = this.scarabs.some((scarab) => {
      const localAge = this.age - this.telegraphMs - scarab.delay;
      if (localAge < 0 || localAge > scarab.travelMs) {
        return false;
      }

      return Phaser.Math.Distance.Between(
        player.position.x,
        player.position.y,
        scarab.position.x,
        scarab.position.y,
      ) <= player.radius + 10;
    });

    if (hitsScarab) {
      return true;
    }

    return this.rays.some((ray) => {
      return ray.state === "active" && circleIntersectsLine(player.position, player.radius, ray.start, ray.end, 9);
    });
  }

  isFinished(): boolean {
    return this.age > this.telegraphMs + this.getActiveMs() + this.lingerMs;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private getActiveMs(): number {
    const horusMs = this.hasHorusRewind ? this.horusDurationMs : 0;
    const scarabMs = this.scarabs.reduce((max, scarab) => Math.max(max, scarab.delay + scarab.travelMs), 0);

    return Math.max(horusMs, scarabMs);
  }

  private createScarabEchoes(trajectories: ScarabRewindTrajectory[]): void {
    if (trajectories.length === 0) {
      return;
    }

    const targetWindowMs = this.hasHorusRewind ? this.horusDurationMs * 0.98 : this.horusDurationMs * 0.84;
    const travelMs = Phaser.Math.Clamp(
      trajectories.reduce((sum, trajectory) => sum + trajectory.travelMs, 0) / trajectories.length,
      760,
      1160,
    );
    const spacing = trajectories.length > 1
      ? Math.max(520, (targetWindowMs - travelMs) / (trajectories.length - 1))
      : 0;

    this.scarabs.push(...trajectories.map((trajectory, index) => ({
      start: trajectory.end.clone(),
      end: trajectory.start.clone(),
      position: trajectory.end.clone(),
      delay: (trajectories.length - 1 - index) * spacing,
      travelMs,
    })));
  }

  private updateScarabs(): void {
    for (const scarab of this.scarabs) {
      const localAge = Phaser.Math.Clamp(this.age - this.telegraphMs - scarab.delay, 0, scarab.travelMs);
      const progress = Phaser.Math.Easing.Sine.InOut(localAge / scarab.travelMs);
      scarab.position.copy(scarab.start).lerp(scarab.end, progress);
    }
  }

  private updateHorusRays(): void {
    this.rays.length = 0;
    const rayAge = Phaser.Math.Clamp(this.age - this.telegraphMs, 0, this.horusDurationMs);
    const baseAngle = -rayAge * 0.00072 - Math.PI / 2;
    const pulse = rayAge % 1100;
    const step = Math.floor(rayAge / 1100);

    for (let index = 0; index < HORUS_RAY_COUNT; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / HORUS_RAY_COUNT;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      const start = this.rayCenter.clone().add(direction.clone().scale(20));
      const end = this.rayCenter.clone().add(direction.scale(HORUS_RAY_LENGTH));
      const selected = (index - step + HORUS_RAY_COUNT) % HORUS_ACTIVE_RAY_STRIDE === 0;
      let state: RewindRay["state"] = "memory";

      if (this.age < this.telegraphMs) {
        state = selected ? "telegraph" : "memory";
      } else if (selected && pulse > 190 && pulse <= 540) {
        state = "active";
      } else if (selected && pulse > 540 && pulse <= 850) {
        state = "telegraph";
      } else if (selected && pulse > 850 && pulse <= 1010) {
        state = "fade";
      }

      this.rays.push({ start, end, state });
    }
  }

  private draw(): void {
    this.graphics.clear();
    this.drawRisingSands();

    if (this.hasHorusRewind) {
      this.drawHorusRewind();
    }

    if (this.scarabs.length > 0) {
      this.drawScarabRewind();
    }

    this.drawHourglass();
  }

  private getHourglassCenter(): Phaser.Math.Vector2 {
    const { bossPosition } = this.context;
    const y = Math.max(42, bossPosition.y - Phaser.Math.Clamp(this.context.arena.size * 0.32, 84, 104));

    return new Phaser.Math.Vector2(bossPosition.x, y);
  }

  private drawRisingSands(): void {
    const { arena } = this.context;
    const hourglass = this.getHourglassCenter();
    const charge = Phaser.Math.Clamp(this.age / this.telegraphMs, 0, 1);
    const activeMs = Math.max(1, this.getActiveMs());
    const activeProgress = Phaser.Math.Clamp((this.age - this.telegraphMs) / activeMs, 0, 1);
    const intensity = this.active ? 0.92 : charge * 0.58;
    const pulse = 0.5 + Math.sin(this.age * 0.018) * 0.5;
    const bottomY = arena.y + arena.size + 18;

    if (intensity <= 0.02) {
      return;
    }

    this.graphics.lineStyle(2, 0xf0d58a, 0.08 * intensity);
    this.graphics.lineBetween(arena.x + 12, bottomY, hourglass.x - 16, hourglass.y + 24);
    this.graphics.lineBetween(arena.x + arena.size - 12, bottomY, hourglass.x + 16, hourglass.y + 24);

    this.graphics.fillStyle(0x071018, 0.14 * intensity);
    this.graphics.fillEllipse(arena.x + arena.size / 2, bottomY - 12, arena.size * 0.86, 34);
    this.graphics.lineStyle(1.4, 0x8df7ff, 0.16 * intensity);
    this.graphics.strokeEllipse(arena.x + arena.size / 2, bottomY - 12, arena.size * 0.82, 30);

    const streamCount = this.hasHorusRewind && this.scarabs.length > 0 ? 18 : 12;
    for (let index = 0; index < streamCount; index += 1) {
      const column = index / (streamCount - 1);
      const laneX = Phaser.Math.Linear(arena.x + arena.size * 0.14, arena.x + arena.size * 0.86, column);
      const phase = (this.age * 0.00058 + index * 0.091 + activeProgress * 0.35) % 1;
      const rise = Phaser.Math.Easing.Sine.InOut(phase);
      const x = Phaser.Math.Linear(laneX, hourglass.x + Math.sin(index * 1.7) * 24, rise);
      const y = Phaser.Math.Linear(bottomY, hourglass.y + 26, rise);
      const radius = Phaser.Math.Linear(2.8, 1.1, rise) + pulse * 0.35;
      const alpha = intensity * Phaser.Math.Linear(0.52, 0.86, 1 - rise);

      this.graphics.fillStyle(index % 3 === 0 ? 0x8df7ff : 0xf0d58a, alpha);
      this.graphics.fillCircle(x + Math.sin(this.age * 0.015 + index) * 5, y, radius);

      if (index % 3 === 0) {
        this.graphics.lineStyle(1.2, 0xf8f1d1, alpha * 0.18);
        this.graphics.lineBetween(x, y + 8, x + Math.sin(index) * 4, y - 12);
      }
    }
  }

  private drawHourglass(): void {
    const center = this.getHourglassCenter();
    const pulse = 0.5 + Math.sin(this.age * 0.014) * 0.5;
    const x = center.x;
    const y = center.y;
    const sandPhase = (this.age * 0.0011) % 1;
    const combo = this.hasHorusRewind && this.scarabs.length > 0;
    const charge = Phaser.Math.Clamp(this.age / this.telegraphMs, 0, 1);
    const scale = combo ? 1.08 : 1;

    this.graphics.fillStyle(0x02070c, 0.42 + charge * 0.18);
    this.graphics.fillCircle(x, y, (34 + pulse * 2) * scale);
    this.graphics.lineStyle(2, 0xf0d58a, 0.58 + pulse * 0.24);
    this.graphics.strokeCircle(x, y, (29 + pulse * 2) * scale);
    if (combo) {
      this.graphics.lineStyle(1.4, 0x8df7ff, 0.26 + pulse * 0.22);
      this.graphics.strokeCircle(x, y, 39 + pulse * 4);
    }
    this.graphics.lineStyle(3, 0xe8ca7f, 0.9);
    this.graphics.lineBetween(x - 16, y - 19, x + 16, y - 19);
    this.graphics.lineBetween(x - 16, y + 19, x + 16, y + 19);
    this.graphics.lineStyle(2.2, 0xf0d58a, 0.92);
    this.graphics.lineBetween(x - 13, y - 16, x + 13, y + 16);
    this.graphics.lineBetween(x + 13, y - 16, x - 13, y + 16);
    this.graphics.lineStyle(1.4, 0x8df7ff, 0.36 + pulse * 0.2);
    this.graphics.strokeTriangle(x - 11, y - 14, x + 11, y - 14, x, y - 1);
    this.graphics.strokeTriangle(x - 11, y + 14, x + 11, y + 14, x, y + 1);

    this.graphics.fillStyle(0xf0d58a, 0.68 + pulse * 0.18);
    this.graphics.fillTriangle(x - 8, y + 13, x + 8, y + 13, x, y + 3);
    this.graphics.fillStyle(0x35d6cb, 0.8 + pulse * 0.16);
    this.graphics.fillTriangle(x - 7, y - 13, x + 7, y - 13, x, y - 3);
    this.graphics.fillCircle(x, y, 3.8 + pulse);
    this.graphics.lineStyle(2, 0xf8f1d1, 0.44 + pulse * 0.18);
    this.graphics.lineBetween(x, y + 14, x, y - 14);

    const particleCount = combo ? 12 : 8;
    for (let index = 0; index < particleCount; index += 1) {
      const t = (sandPhase + index / particleCount) % 1;
      const particleY = Phaser.Math.Linear(y + 15, y - 15, t);
      const particleX = x + Math.sin(this.age * 0.018 + index) * 4;
      this.graphics.fillStyle(index % 2 === 0 ? 0xf0d58a : 0x8df7ff, 0.24 + t * 0.56);
      this.graphics.fillCircle(particleX, particleY, 1.4 + t * 1.4);
    }
  }

  private drawScarabRewind(): void {
    for (const scarab of this.scarabs) {
      const localAge = this.age - this.telegraphMs - scarab.delay;
      if (localAge >= -this.scarabWindupMs && localAge < 0) {
        const windupAlpha = Phaser.Math.Clamp(1 + localAge / this.scarabWindupMs, 0, 1);
        this.drawScarabWindup(scarab, windupAlpha);
        continue;
      }

      if (localAge < 0 || localAge > scarab.travelMs + 180) {
        continue;
      }

      const alpha = localAge > scarab.travelMs - 260
        ? Phaser.Math.Clamp((scarab.travelMs + 180 - localAge) / 440, 0, 1)
        : 1;
      const direction = scarab.end.clone().subtract(scarab.start).normalize();
      drawScarabTrail(this.graphics, scarab.position, direction, { alpha, variant: "rewind" });
      drawScarabBody(this.graphics, scarab.position, direction, {
        alpha,
        variant: "rewind",
        time: this.age - scarab.delay,
      });
    }
  }

  private drawScarabWindup(scarab: RewindScarab, alpha: number): void {
    const direction = scarab.end.clone().subtract(scarab.start);
    const distance = direction.length();

    drawScarabWindup(this.graphics, scarab.start, direction, distance, alpha, { variant: "rewind" });
  }

  private drawHorusRewind(): void {
    const charge = Phaser.Math.Clamp(this.age / this.telegraphMs, 0, 1);
    drawHorusRays(this.graphics, this.rays, { age: this.age, charge, variant: "rewind" });
    drawHorusEye(this.graphics, this.rayCenter, { age: this.age, charge, scale: 0.94, variant: "rewind" });
  }
}
