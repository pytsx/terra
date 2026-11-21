import type { EntityBrain } from '../../entity-types';

const cowBrain: EntityBrain = {
  decide(sensor) {
    if (!sensor.near(520)) return { action: 'idle' };
    if (!sensor.ground && !sensor.swimming) return { action: 'idle' };
    const distance = sensor.near(80)
      ? Math.hypot(
          sensor.player.x - sensor.self.x,
          sensor.player.y - sensor.self.y,
        )
      : Infinity;
    if (distance < 80) {
      const direction = sensor.player.x < sensor.self.x ? 1 : -1;
      return { action: 'wander', velocityX: direction * 55 };
    }
    return {
      action: 'wander',
      velocityX: sensor.random() > 0.5 ? 28 : -28,
    };
  },
};

export default cowBrain;
