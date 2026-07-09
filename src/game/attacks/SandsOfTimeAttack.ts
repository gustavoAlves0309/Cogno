import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
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

interface RewindRay {
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
  private readonly scarabWindupMs = 420;
  private readonly scarabs: RewindScarab[] = [];
  private readonly rays: RewindRay[] = [];
  private readonly rayCenter: Phaser.Math.Vector2;
  private readonly rayCount = 12;
  private age = 0;
  private active = false;

  constructor(context: AttackContext, _time: number, snapshot: SandsRewindSnapshot) {
    this.context = context;
    this.hasHorusRewind = snapshot.horus === true;
    this.graphics = context.scene.add.graphics().setDepth(58);
    this.rayCenter = new Phaser.Math.Vector2(context.stageWidth / 2, context.arena.y - 34);
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

    const targetWindowMs = this.hasHorusRewind ? this.horusDurationMs * 0.94 : this.horusDurationMs * 0.78;
    const travelMs = Phaser.Math.Clamp(
      trajectories.reduce((sum, trajectory) => sum + trajectory.travelMs, 0) / trajectories.length,
      620,
      980,
    );
    const spacing = trajectories.length > 1
      ? Math.max(360, (targetWindowMs - travelMs) / (trajectories.length - 1))
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

    for (let index = 0; index < this.rayCount; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / this.rayCount;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      const start = this.rayCenter.clone().add(direction.clone().scale(20));
      const end = this.rayCenter.clone().add(direction.scale(620));
      const selected = (index - step + this.rayCount) % 3 === 0;
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
    this.drawHourglass();

    if (this.hasHorusRewind) {
      this.drawHorusRewind();
    }

    if (this.scarabs.length > 0) {
      this.drawScarabRewind();
    }
  }

  private drawHourglass(): void {
    const { bossPosition } = this.context;
    const pulse = 0.5 + Math.sin(this.age * 0.014) * 0.5;
    const x = bossPosition.x;
    const y = Math.max(42, bossPosition.y - 84);
    const sandPhase = (this.age * 0.0011) % 1;
    const combo = this.hasHorusRewind && this.scarabs.length > 0;

    this.graphics.lineStyle(2, 0xf0d58a, 0.56 + pulse * 0.22);
    this.graphics.strokeCircle(x, y, 25 + pulse * 2);
    if (combo) {
      this.graphics.lineStyle(1.4, 0x8df7ff, 0.26 + pulse * 0.22);
      this.graphics.strokeCircle(x, y, 33 + pulse * 4);
    }
    this.graphics.fillStyle(0x071018, 0.74);
    this.graphics.fillCircle(x, y, 19);
    this.graphics.lineStyle(3, 0xe8ca7f, 0.86);
    this.graphics.lineBetween(x - 12, y - 15, x + 12, y - 15);
    this.graphics.lineBetween(x - 12, y + 15, x + 12, y + 15);
    this.graphics.lineStyle(2, 0xf0d58a, 0.9);
    this.graphics.lineBetween(x - 10, y - 12, x + 10, y + 12);
    this.graphics.lineBetween(x + 10, y - 12, x - 10, y + 12);
    this.graphics.fillStyle(0x35d6cb, 0.92);
    this.graphics.fillCircle(x, y, 3.5 + pulse);
    this.graphics.lineStyle(2, 0x8df7ff, 0.34 + pulse * 0.16);
    this.graphics.lineBetween(x, y + 10, x, y - 10);

    const particleCount = combo ? 12 : 8;
    for (let index = 0; index < particleCount; index += 1) {
      const t = (sandPhase + index / particleCount) % 1;
      const particleY = Phaser.Math.Linear(y + 12, y - 12, t);
      const particleX = x + Math.sin(this.age * 0.018 + index) * 3;
      this.graphics.fillStyle(index % 2 === 0 ? 0xf0d58a : 0x8df7ff, 0.2 + t * 0.52);
      this.graphics.fillCircle(particleX, particleY, 1.4 + t * 1.2);
    }
  }

  private drawScarabRewind(): void {
    const shimmer = 0.42 + Math.sin(this.age * 0.022) * 0.18;

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
      this.drawRewindTrail(scarab.position, direction, alpha);
      this.drawRewindScarab(scarab.position, direction, shimmer, alpha);
    }
  }

  private drawScarabWindup(scarab: RewindScarab, alpha: number): void {
    const direction = scarab.end.clone().subtract(scarab.start);
    const distance = direction.length();
    direction.normalize();
    const flash = Math.sin(alpha * Math.PI);
    const segment = Math.min(distance * 0.36, 132);

    this.graphics.lineStyle(2, 0xf0d58a, 0.18 + flash * 0.28);
    for (let step = 0; step <= segment; step += 22) {
      const point = scarab.start.clone().add(direction.clone().scale(step));
      const dotAlpha = (1 - step / (segment + 1)) * flash;
      this.graphics.fillStyle(step % 44 === 0 ? 0xf0d58a : 0x35d6cb, dotAlpha * 0.62);
      this.graphics.fillCircle(point.x, point.y, 2.4 + dotAlpha * 2.2);
    }

    this.graphics.lineStyle(1.4, 0x8df7ff, flash * 0.24);
    this.graphics.strokeCircle(scarab.start.x, scarab.start.y, 12 + flash * 8);
  }

  private drawRewindTrail(position: Phaser.Math.Vector2, direction: Phaser.Math.Vector2, alpha: number): void {
    for (let index = 0; index < 7; index += 1) {
      const point = position.clone().subtract(direction.clone().scale(8 + index * 7));
      this.graphics.fillStyle(index % 2 === 0 ? 0x35d6cb : 0xf0d58a, alpha * (0.5 - index * 0.052));
      this.graphics.fillCircle(point.x, point.y, 6.4 - index * 0.48);
    }
  }

  private drawRewindScarab(
    position: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    shimmer: number,
    alpha: number,
  ): void {
    const normal = new Phaser.Math.Vector2(-direction.y, direction.x);
    const head = position.clone().add(direction.clone().scale(8));
    const tail = position.clone().subtract(direction.clone().scale(8));

    this.graphics.fillStyle(0x153f55, alpha * 0.96);
    this.graphics.fillTriangle(
      head.x,
      head.y,
      tail.x + normal.x * 9,
      tail.y + normal.y * 9,
      tail.x - normal.x * 9,
      tail.y - normal.y * 9,
    );
    this.graphics.lineStyle(3, 0x8df7ff, alpha * (0.58 + shimmer * 0.38));
    this.graphics.strokeCircle(position.x, position.y, 13);
    this.graphics.fillStyle(0xf0d58a, alpha);
    this.graphics.fillCircle(head.x, head.y, 5.8);
    this.graphics.lineStyle(1.4, 0xf8f1d1, alpha * 0.72);
    this.graphics.lineBetween(tail.x, tail.y, head.x, head.y);
  }

  private drawHorusRewind(): void {
    const charge = Phaser.Math.Clamp(this.age / this.telegraphMs, 0, 1);

    for (const ray of this.rays) {
      if (ray.state === "active") {
        this.graphics.lineStyle(15, 0x35d6cb, 0.2);
        this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
        this.graphics.lineStyle(8, 0xf0d58a, 0.76);
        this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
        this.graphics.lineStyle(3, 0xf8f1d1, 0.92);
      } else if (ray.state === "telegraph") {
        this.graphics.lineStyle(4, 0x8df7ff, 0.16 + charge * 0.32);
      } else if (ray.state === "fade") {
        this.graphics.lineStyle(3, 0xf0d58a, 0.2);
      } else {
        this.graphics.lineStyle(1.5, 0x8df7ff, 0.08);
      }

      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    }

    const pulse = 0.5 + Math.sin(this.age * 0.013) * 0.5;
    this.graphics.fillStyle(0x071018, 0.82);
    this.graphics.fillEllipse(this.rayCenter.x, this.rayCenter.y, 54, 28);
    this.graphics.lineStyle(2, 0xf0d58a, 0.72);
    this.graphics.strokeEllipse(this.rayCenter.x, this.rayCenter.y, 58, 30);
    this.graphics.fillStyle(0x35d6cb, 0.8 + pulse * 0.16);
    this.graphics.fillCircle(this.rayCenter.x, this.rayCenter.y, 7 + pulse * 2);
  }
}
