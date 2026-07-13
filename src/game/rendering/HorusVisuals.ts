import Phaser from "phaser";

export type HorusVisualVariant = "normal" | "rewind";
export type HorusRayVisualState = "off" | "memory" | "telegraph" | "active" | "fade";

export interface HorusRayVisual {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
  state: HorusRayVisualState;
}

export const HORUS_RAY_COUNT = 12;
export const HORUS_ACTIVE_RAY_STRIDE = 3;
export const HORUS_RAY_LENGTH = 620;

interface HorusVisualOptions {
  age?: number;
  charge?: number;
  scale?: number;
  variant?: HorusVisualVariant;
}

const COLORS = {
  ink: 0x05070c,
  deepNavy: 0x07131b,
  lapis: 0x153f55,
  cyan: 0x35d6cb,
  cyanSoft: 0x8df7ff,
  gold: 0xf0d58a,
  goldDeep: 0xd8b65d,
  goldLight: 0xf8f1d1,
  sun: 0xffd36f,
};

export function drawHorusRays(
  graphics: Phaser.GameObjects.Graphics,
  rays: HorusRayVisual[],
  options: HorusVisualOptions = {},
): void {
  const age = options.age ?? 0;
  const charge = options.charge ?? 1;
  const variant = options.variant ?? "normal";

  for (const ray of rays) {
    drawHorusRay(graphics, ray, age, charge, variant);
  }
}

export function drawHorusEye(
  graphics: Phaser.GameObjects.Graphics,
  center: Phaser.Math.Vector2,
  options: HorusVisualOptions = {},
): void {
  const age = options.age ?? 0;
  const charge = options.charge ?? 1;
  const scale = options.scale ?? 1;
  const variant = options.variant ?? "normal";
  const rewind = variant === "rewind";
  const pulse = 0.5 + Math.sin(age * (rewind ? 0.013 : 0.008)) * 0.5;
  const x = center.x;
  const y = center.y;
  const s = scale;
  const aura = rewind ? COLORS.cyan : COLORS.gold;
  const line = rewind ? COLORS.cyanSoft : COLORS.goldLight;
  const iris = rewind ? COLORS.gold : COLORS.cyan;
  const shell = rewind ? COLORS.deepNavy : COLORS.gold;

  graphics.fillStyle(aura, (rewind ? 0.1 : 0.18) * charge + pulse * 0.07);
  graphics.fillCircle(x, y, (42 + pulse * 5) * s);
  graphics.lineStyle(1.6 * s, rewind ? COLORS.cyan : COLORS.goldDeep, (0.2 + pulse * 0.18) * charge);
  graphics.strokeCircle(x, y, (48 + pulse * 5) * s);

  graphics.lineStyle(2.2 * s, rewind ? COLORS.cyanSoft : COLORS.sun, 0.42 * charge);
  for (let index = 0; index < 8; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 8 + age * (rewind ? -0.0008 : 0.0008);
    const inner = new Phaser.Math.Vector2(x + Math.cos(angle) * 29 * s, y + Math.sin(angle) * 17 * s);
    const outer = new Phaser.Math.Vector2(x + Math.cos(angle) * 40 * s, y + Math.sin(angle) * 25 * s);
    graphics.lineBetween(inner.x, inner.y, outer.x, outer.y);
  }

  graphics.fillStyle(shell, rewind ? 0.5 + charge * 0.16 : 0.68);
  graphics.fillEllipse(x, y, 58 * s, 30 * s);
  graphics.fillStyle(COLORS.ink, rewind ? 0.84 : 0.9);
  graphics.fillEllipse(x, y, 49 * s, 23 * s);
  graphics.lineStyle(2.4 * s, line, rewind ? 0.62 + pulse * 0.14 : 0.82 + pulse * 0.1);
  graphics.strokeEllipse(x, y, 58 * s, 28 * s);

  graphics.lineStyle(2.4 * s, line, rewind ? 0.54 : 0.78);
  graphics.lineBetween(x - 29 * s, y, x - 54 * s, y + 9 * s);
  graphics.lineBetween(x + 29 * s, y, x + 52 * s, y - 8 * s);
  graphics.lineStyle(1.4 * s, rewind ? COLORS.goldLight : COLORS.goldDeep, rewind ? 0.44 : 0.58);
  graphics.lineBetween(x - 37 * s, y + 5 * s, x - 47 * s, y + 20 * s);
  graphics.lineBetween(x + 36 * s, y - 5 * s, x + 46 * s, y - 16 * s);

  graphics.fillStyle(iris, 0.9);
  graphics.fillCircle(x, y, (8.2 + pulse * 1.6) * s);
  graphics.fillStyle(COLORS.ink, 0.88);
  graphics.fillCircle(x, y, 3.6 * s);
  graphics.fillStyle(COLORS.goldLight, 0.92);
  graphics.fillCircle(x + 2.4 * s, y - 2.4 * s, 1.8 * s);

  graphics.lineStyle(1.2 * s, rewind ? COLORS.cyanSoft : COLORS.goldLight, 0.34 + pulse * 0.18);
  graphics.strokeTriangle(x - 22 * s, y - 2 * s, x, y - 13 * s, x + 22 * s, y - 2 * s);
  graphics.strokeTriangle(x - 20 * s, y + 3 * s, x, y + 11 * s, x + 20 * s, y + 3 * s);
}

function drawHorusRay(
  graphics: Phaser.GameObjects.Graphics,
  ray: HorusRayVisual,
  age: number,
  charge: number,
  variant: HorusVisualVariant,
): void {
  const rewind = variant === "rewind";

  if (ray.state === "active") {
    graphics.lineStyle(18, rewind ? COLORS.cyan : COLORS.gold, rewind ? 0.18 : 0.22);
    graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    graphics.lineStyle(10, rewind ? COLORS.gold : COLORS.cyan, rewind ? 0.72 : 0.74);
    graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    graphics.lineStyle(3, COLORS.goldLight, 0.94);
    graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    drawRayGlyphs(graphics, ray, age, rewind ? COLORS.cyanSoft : COLORS.goldLight, 0.28);
    return;
  }

  if (ray.state === "telegraph") {
    graphics.lineStyle(4, rewind ? COLORS.cyanSoft : COLORS.cyanSoft, (rewind ? 0.16 : 0.24) + charge * 0.22);
    graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    drawRayGlyphs(graphics, ray, age, rewind ? COLORS.goldLight : COLORS.goldLight, 0.36 * charge);
    return;
  }

  if (ray.state === "fade") {
    graphics.lineStyle(4, rewind ? COLORS.gold : COLORS.cyanSoft, rewind ? 0.2 : 0.18);
    graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
    return;
  }

  const alpha = ray.state === "memory" ? 0.09 : 0.08;
  graphics.lineStyle(ray.state === "memory" ? 1.8 : 1.4, rewind ? COLORS.cyanSoft : COLORS.goldDeep, alpha);
  graphics.lineBetween(ray.start.x, ray.start.y, ray.end.x, ray.end.y);
}

function drawRayGlyphs(
  graphics: Phaser.GameObjects.Graphics,
  ray: HorusRayVisual,
  age: number,
  color: number,
  alpha: number,
): void {
  const direction = ray.end.clone().subtract(ray.start).normalize();
  const normal = new Phaser.Math.Vector2(-direction.y, direction.x);
  const shimmer = 0.68 + Math.sin(age * 0.025) * 0.22;

  for (let distance = 48; distance < 565; distance += 64) {
    const point = ray.start.clone().add(direction.clone().scale(distance));
    const wing = 4 + Math.sin(age * 0.012 + distance) * 1.2;

    graphics.fillStyle(color, alpha * shimmer);
    graphics.fillCircle(point.x, point.y, 2.2);
    graphics.lineStyle(1.1, color, alpha * 0.7);
    graphics.lineBetween(
      point.x - normal.x * wing,
      point.y - normal.y * wing,
      point.x + normal.x * wing,
      point.y + normal.y * wing,
    );
  }
}
