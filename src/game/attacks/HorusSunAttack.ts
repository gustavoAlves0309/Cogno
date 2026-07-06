import Phaser from "phaser";
import { circleIntersectsLine } from "../math/collision";
import type { Attack, AttackContext, PlayerState } from "../types";

interface HorusRay {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  state: "off" | "telegraph" | "active" | "fade";
}

export class HorusSunAttack implements Attack {
  readonly name = "Olho-Sol De Horus";

  private readonly context: AttackContext;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly createdAt: number;
  private readonly center: Phaser.Math.Vector2;
  private readonly duration = 8600;
  private readonly rays: HorusRay[] = [];
  private readonly rayCount = 12;
  private readonly rayLength = 620;

  constructor(context: AttackContext, time: number) {
    this.context = context;
    this.createdAt = time;
    this.center = new Phaser.Math.Vector2(context.stageWidth / 2, context.arena.y - 36);
    this.graphics = context.scene.add.graphics().setDepth(32);
  }

  update(time: number): void {
    const age = time - this.createdAt;
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
    return this.context.scene.time.now - this.createdAt > this.duration;
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(age: number): void {
    this.graphics.clear();

    this.graphics.fillStyle(0xe7be58, 0.74);
    this.graphics.fillCircle(this.center.x, this.center.y, 19);
    this.graphics.lineStyle(3, 0xffe7a2, 0.86);
    this.graphics.strokeCircle(this.center.x, this.center.y, 27 + Math.sin(age * 0.008) * 3);
    this.graphics.lineStyle(2, 0x2a1a09, 0.72);
    this.graphics.strokeEllipse(this.center.x, this.center.y, 36, 19);

    for (const ray of this.rays) {
      if (ray.state === "active") {
        this.graphics.lineStyle(10, 0x8df5ff, 0.82);
        this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
        this.graphics.lineStyle(3, 0xfdf1bd, 0.9);
      } else if (ray.state === "telegraph") {
        this.graphics.lineStyle(5, 0x8df5ff, 0.42);
      } else if (ray.state === "fade") {
        this.graphics.lineStyle(4, 0x8df5ff, 0.18);
      } else {
        this.graphics.lineStyle(2, 0xd1b15e, 0.13);
      }

      this.graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    }
  }
}
