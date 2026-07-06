import Phaser from "phaser";

export function circleIntersectsRect(
  circle: Phaser.Math.Vector2,
  radius: number,
  rect: Phaser.Geom.Rectangle,
): boolean {
  const closestX = Phaser.Math.Clamp(circle.x, rect.left, rect.right);
  const closestY = Phaser.Math.Clamp(circle.y, rect.top, rect.bottom);
  return Phaser.Math.Distance.Between(circle.x, circle.y, closestX, closestY) <= radius;
}

export function circleIntersectsLine(
  circle: Phaser.Math.Vector2,
  radius: number,
  start: Phaser.Math.Vector2,
  end: Phaser.Math.Vector2,
  thickness: number,
): boolean {
  return distanceToSegment(circle, start, end) <= radius + thickness / 2;
}

export function pointInTriangle(point: Phaser.Math.Vector2, triangle: Phaser.Geom.Triangle): boolean {
  return Phaser.Geom.Triangle.Contains(triangle, point.x, point.y);
}

function distanceToSegment(
  point: Phaser.Math.Vector2,
  start: Phaser.Math.Vector2,
  end: Phaser.Math.Vector2,
): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSq = segmentX * segmentX + segmentY * segmentY;

  if (lengthSq === 0) {
    return Phaser.Math.Distance.Between(point.x, point.y, start.x, start.y);
  }

  const t = Phaser.Math.Clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSq,
    0,
    1,
  );
  const projectedX = start.x + t * segmentX;
  const projectedY = start.y + t * segmentY;

  return Phaser.Math.Distance.Between(point.x, point.y, projectedX, projectedY);
}
