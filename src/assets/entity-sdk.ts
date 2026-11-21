import type { EntityDecision, EntitySensor } from './entity-types';

export function distanceToPlayer(sensor: EntitySensor) {
  const a = sensor.self.x + sensor.self.w / 2;
  const b = sensor.player.x + sensor.player.w / 2;
  const y1 = sensor.self.y + sensor.self.h / 2;
  const y2 = sensor.player.y + sensor.player.h / 2;
  return Math.hypot(a - b, y1 - y2);
}

export function directionToPlayer(sensor: EntitySensor) {
  const selfCenter = sensor.self.x + sensor.self.w / 2;
  const playerCenter = sensor.player.x + sensor.player.w / 2;
  return Math.sign(playerCenter - selfCenter);
}

export function chaseOrWander(
  sensor: EntitySensor,
  chaseRadius: number,
  speed: number,
  wanderSpeed: number,
): EntityDecision {
  if (distanceToPlayer(sensor) <= chaseRadius)
    return { action: 'chase', velocityX: directionToPlayer(sensor) * speed };
  return { action: 'wander', velocityX: sensor.random() > 0.5 ? wanderSpeed : -wanderSpeed };
}
