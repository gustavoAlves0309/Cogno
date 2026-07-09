import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

interface HorusRay {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  state: "off" | "telegraph" | "active" | "fade";
}

export class HorusSunAttack implements Attack {
  readonly name = "Horus Sun Eye";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private startedAt: number | null = null;
  private readonly center: Phaser.Math.Vector2;
  private readonly duration = 8600;
  private readonly rays: HorusRay[] = [];
  private readonly rayCount = 12;
  private readonly rayLength = 620;
  private age = 0;

  constructor(context: AttackContext, time: number) {
    this.context = context;
    this.createdAt = time;
    this.center = new Phaser.Math.Vector2(context.stageWidth / 2, context.arena.y - 36);
    this.graphics = context.scene.add.graphics().setDepth(32);
  }

  update(time: number): void {
    if (this.startedAt === null) {
      this.startedAt = time;
    }

    const age = time - this.startedAt;
    this.age = age;
    const baseAngle = age * 0.00072 - Math.PI / 2;
    const pulse = age % 1100;
    const step = Math.floor(age / 1100);

    this.rays.length = 0;
    for (let index = 0; index < this.rayCount; index += 1) {
      const angle = baseAngle + (Math.PI * 2 * index) / this.rayCount;
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      const start = this.center.clone().add(direction.clone().scale(22));
      const end = this.center.clone().add(direction.scale(this.rayLength));
      const selected = (index + step) % 3 === 0;

      let state: HorusRay["state"] = "off";
      if (selected && pulse > 250 && pulse <= 560) {
        state = "telegraph";
      } else if (selected && pulse > 560 && pulse <= 900) {
        state = "active";
      } else if (selected && pulse > 900) {
        state = "fade";
      }

      this.rays.push({ start, end, state });
    }

    this.draw(age);
  }

  collides(player: PlayerState): boolean {
    return this.rays.some((ray) => {
      return ray.state === "active" && circleIntersectsLine(player.position, player.radius, ray.start, ray.end, 10);
    });
  }

  isFinished(): boolean {
    return this.age > this.duration;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(age: number): void {
    this.graphics.clear();

    for (const ray of this.rays) {
      if (ray.state === "active") {
        this.graphics.lineStyle(16, 0xf0c75d, 0.22);
        this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
        this.graphics.lineStyle(10, 0x45dfe8, 0.74);
        this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
        this.graphics.lineStyle(3, 0xfff2c0, 0.92);
      } else if (ray.state === "telegraph") {
        this.graphics.lineStyle(4, 0x8df5ff, 0.32);
        this.drawTelegraphMarks(ray, age);
      } else if (ray.state === "fade") {
        this.graphics.lineStyle(4, 0x8df5ff, 0.18);
      } else {
        this.graphics.lineStyle(2, 0xd1b15e, 0.1);
      }

      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    }

    const pulse = 0.5 + Math.sin(age * 0.008) * 0.5;
    this.graphics.fillStyle(0xe7be58, 0.2 + pulse * 0.08);
    this.graphics.fillCircle(this.center.x, this.center.y, 42 + pulse * 4);
    this.graphics.fillStyle(0xe7be58, 0.78);
    this.graphics.fillCircle(this.center.x, this.center.y, 21);
    this.graphics.lineStyle(3, 0xffe7a2, 0.9);
    this.graphics.strokeCircle(this.center.x, this.center.y, 29 + pulse * 3);
    this.graphics.fillStyle(0x091018, 0.88);
    this.graphics.fillEllipse(this.center.x, this.center.y, 43, 23);
    this.graphics.lineStyle(2, 0xffe7a2, 0.8);
    this.graphics.strokeEllipse(this.center.x, this.center.y, 47, 25);
    this.graphics.fillStyle(0x35d6cb, 0.92);
    this.graphics.fillCircle(this.center.x, this.center.y, 7 + pulse * 2);
    this.graphics.fillStyle(0xfaf0be, 0.92);
    this.graphics.fillCircle(this.center.x + 2, this.center.y - 2, 2);
  }

  private drawTelegraphMarks(ray: HorusRay, age: number): void {
    const direction = ray.end.clone().subtract(ray.start).normalize();
    const shimmer = 0.45 + Math.sin(age * 0.025) * 0.24;

    for (let distance = 46; distance < 560; distance += 58) {
      const point = ray.start.clone().add(direction.clone().scale(distance));
      this.graphics.fillStyle(0xffe7a2, shimmer);
      this.graphics.fillCircle(point.x, point.y, 2.5);
    }
  }
}
