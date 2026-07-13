import Phaser from "phaser";

type ScarabVariant = "normal" | "rewind";

interface ScarabDrawOptions {
  alpha?: number;
  scale?: number;
  time?: number;
  variant?: ScarabVariant;
  visibility?: number;
}

interface ScarabTrailOptions extends ScarabDrawOptions {
  segments?: number;
}

const COLORS = {
  ink: 0x05070c,
  deepNavy: 0x07131b,
  lapis: 0x153f55,
  lapisLight: 0x1f5d73,
  cyan: 0x35d6cb,
  cyanSoft: 0x8df7ff,
  gold: 0xf0d58a,
  goldLight: 0xf8f1d1,
  bronze: 0xd8b65d,
};

export function drawScarabTrail(
  graphics: Phaser.GameObjects.Graphics,
  position: Phaser.Math.Vector2,
  direction: Phaser.Math.Vector2,
  options: ScarabTrailOptions = {},
): void {
  const normalized = direction.clone().normalize();
  const alpha = options.alpha ?? 1;
  const scale = options.scale ?? 1;
  const variant = options.variant ?? "normal";
  const segments = options.segments ?? (variant === "rewind" ? 9 : 8);

  for (let index = 0; index < segments; index += 1) {
    const distance = (9 + index * 7.5) * scale;
    const point = position.clone().subtract(normalized.clone().scale(distance));
    const fade = Phaser.Math.Clamp((segments - index) / segments, 0, 1);
    const radius = (variant === "rewind" ? 3.8 : 3.5) * scale - index * 0.28 * scale;
    const color = index % 2 === 0
      ? variant === "rewind" ? COLORS.cyan : COLORS.gold
      : variant === "rewind" ? COLORS.gold : COLORS.cyan;

    graphics.fillStyle(color, alpha * fade * (variant === "rewind" ? 0.42 : 0.34));
    graphics.fillCircle(point.x, point.y, Math.max(1.2, radius));
  }
}

export function drawScarabBody(
  graphics: Phaser.GameObjects.Graphics,
  position: Phaser.Math.Vector2,
  direction: Phaser.Math.Vector2,
  options: ScarabDrawOptions = {},
): void {
  const normalized = direction.clone().normalize();
  const normal = new Phaser.Math.Vector2(-normalized.y, normalized.x);
  const alpha = options.alpha ?? 1;
  const scale = options.scale ?? 1;
  const variant = options.variant ?? "normal";
  const time = options.time ?? 0;
  const wingPulse = 0.5 + Math.sin(time * 0.028) * 0.5;
  const ghost = variant === "rewind";
  const s = scale * 1.04;
  const p = (forward: number, side: number) => position.clone()
    .add(normalized.clone().scale(forward * s))
    .add(normal.clone().scale(side * s));

  const nose = p(19.2, 0);
  const head = p(14.4, 0);
  const tail = p(-19.2, 0);
  const wingSide = 7.4 + wingPulse * 0.85;
  const shell = {
    frontLeft: p(8.2, 5.3),
    shoulderLeft: p(1.8, wingSide),
    bellyLeft: p(-8.2, wingSide + 0.9),
    rearLeft: p(-16.8, 4.6),
    frontRight: p(8.2, -5.3),
    shoulderRight: p(1.8, -wingSide),
    bellyRight: p(-8.2, -(wingSide + 0.9)),
    rearRight: p(-16.8, -4.6),
  };

  const fillPolygon = (points: Phaser.Math.Vector2[]) => {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index].x, points[index].y);
    }
    graphics.closePath();
    graphics.fillPath();
  };

  const strokePolyline = (points: Phaser.Math.Vector2[]) => {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      graphics.lineTo(points[index].x, points[index].y);
    }
    graphics.strokePath();
  };

  const shadowOutline = [
    nose,
    p(11.2, 5.2),
    p(2.2, 9.4),
    p(-8.8, 10.2),
    p(-18.4, 5.5),
    p(-21.5, 0),
    p(-18.4, -5.5),
    p(-8.8, -10.2),
    p(2.2, -9.4),
    p(11.2, -5.2),
  ];
  const bodyOutline = [
    p(10.8, 0),
    shell.frontLeft,
    shell.shoulderLeft,
    shell.bellyLeft,
    shell.rearLeft,
    tail,
    shell.rearRight,
    shell.bellyRight,
    shell.shoulderRight,
    shell.frontRight,
  ];

  const legPairs: Array<[number, number, number]> = [
    [7.2, 5.6, 15.2],
    [-1.6, 7.4, 17],
    [-10.2, 5.7, 15],
  ];

  graphics.lineStyle(3.2 * s, COLORS.ink, alpha * 0.4);
  for (const [forward, side, reach] of legPairs) {
    strokePolyline([p(forward, side * 0.72), p(forward - 1.6, reach * 0.72), p(forward + 1.4, reach)]);
    strokePolyline([p(forward, -side * 0.72), p(forward - 1.6, -reach * 0.72), p(forward + 1.4, -reach)]);
  }

  graphics.lineStyle(1.75 * s, ghost ? COLORS.goldLight : COLORS.bronze, alpha * (ghost ? 0.54 : 0.72));
  for (const [forward, side, reach] of legPairs) {
    strokePolyline([p(forward, side * 0.72), p(forward - 1.6, reach * 0.72), p(forward + 1.4, reach)]);
    strokePolyline([p(forward, -side * 0.72), p(forward - 1.6, -reach * 0.72), p(forward + 1.4, -reach)]);
  }

  graphics.fillStyle(COLORS.ink, alpha * 0.36);
  fillPolygon(shadowOutline);

  graphics.fillStyle(ghost ? COLORS.cyan : COLORS.lapis, alpha * (ghost ? 0.54 : 0.98));
  fillPolygon(bodyOutline);

  graphics.fillStyle(ghost ? COLORS.lapisLight : COLORS.lapisLight, alpha * (ghost ? 0.36 : 0.34));
  fillPolygon([p(7.4, 0.7), shell.frontLeft, shell.shoulderLeft, shell.bellyLeft, shell.rearLeft, p(-18, 0.7), p(-3.8, 0.45)]);
  fillPolygon([p(7.4, -0.7), shell.frontRight, shell.shoulderRight, shell.bellyRight, shell.rearRight, p(-18, -0.7), p(-3.8, -0.45)]);

  graphics.fillStyle(ghost ? COLORS.deepNavy : COLORS.ink, alpha * (ghost ? 0.48 : 0.58));
  fillPolygon([p(12.2, 0), p(7.3, 5.1), p(2.6, 3.9), p(2.6, -3.9), p(7.3, -5.1)]);

  graphics.lineStyle(1.35 * s, ghost ? COLORS.cyanSoft : COLORS.gold, alpha * (ghost ? 0.48 : 0.74));
  strokePolyline([...bodyOutline, bodyOutline[0]]);

  graphics.fillStyle(COLORS.gold, alpha * 0.96);
  graphics.fillCircle(head.x, head.y, 4.25 * s);
  graphics.fillStyle(COLORS.goldLight, alpha * 0.86);
  graphics.fillCircle(nose.x, nose.y, 1.7 * s);

  graphics.lineStyle(1.45 * s, ghost ? COLORS.cyanSoft : COLORS.gold, alpha * (ghost ? 0.62 : 0.78));
  graphics.lineBetween(p(7.8, 0).x, p(7.8, 0).y, tail.x, tail.y);
  graphics.lineBetween(p(-5.4, 0).x, p(-5.4, 0).y, shell.bellyLeft.x, shell.bellyLeft.y);
  graphics.lineBetween(p(-5.4, 0).x, p(-5.4, 0).y, shell.bellyRight.x, shell.bellyRight.y);
  graphics.lineBetween(p(3.4, 3.6).x, p(3.4, 3.6).y, shell.shoulderLeft.x, shell.shoulderLeft.y);
  graphics.lineBetween(p(3.4, -3.6).x, p(3.4, -3.6).y, shell.shoulderRight.x, shell.shoulderRight.y);

  graphics.lineStyle(1.2 * s, COLORS.deepNavy, alpha * 0.82);
  graphics.lineBetween(p(9.8, 3.1).x, p(9.8, 3.1).y, p(13.4, 6.4).x, p(13.4, 6.4).y);
  graphics.lineBetween(p(9.8, -3.1).x, p(9.8, -3.1).y, p(13.4, -6.4).x, p(13.4, -6.4).y);
}

export function drawScarabWindup(
  graphics: Phaser.GameObjects.Graphics,
  start: Phaser.Math.Vector2,
  direction: Phaser.Math.Vector2,
  distance: number,
  alpha: number,
  options: ScarabDrawOptions = {},
): void {
  const normalized = direction.clone().normalize();
  const flash = Math.sin(alpha * Math.PI);
  const scale = options.scale ?? 1;
  const variant = options.variant ?? "normal";
  const visibility = options.visibility ?? 1;
  const segment = Math.min(distance * 0.58, 190 * scale);

  graphics.lineStyle(3 * scale, COLORS.gold, Math.min(0.82, (0.2 + flash * 0.3) * visibility));
  for (let step = 0; step <= segment; step += 24 * scale) {
    const point = start.clone().add(normalized.clone().scale(step));
    const dotAlpha = (1 - step / (segment + 1)) * flash;
    const color = Math.round(step / (24 * scale)) % 2 === 0 ? COLORS.gold : COLORS.cyan;
    graphics.fillStyle(color, Math.min(0.92, dotAlpha * (variant === "rewind" ? 0.66 : 0.5) * visibility));
    graphics.fillCircle(point.x, point.y, (2.4 + dotAlpha * 2.2) * scale * Math.min(1.35, visibility));
  }

  const gateA = start.clone().add(normalized.clone().scale(segment * 0.22));
  const gateB = start.clone().add(normalized.clone().scale(segment * 0.54));
  graphics.lineStyle(1.4 * scale, COLORS.cyanSoft, Math.min(0.72, flash * 0.3 * visibility));
  graphics.strokeCircle(start.x, start.y, (14 + flash * 10) * scale);
  graphics.strokeCircle(gateA.x, gateA.y, (8 + flash * 5) * scale);
  graphics.lineStyle(1.2 * scale, COLORS.goldLight, Math.min(0.62, flash * 0.22 * visibility));
  graphics.strokeCircle(gateB.x, gateB.y, (6 + flash * 4) * scale);
}
