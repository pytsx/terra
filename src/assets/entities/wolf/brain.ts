import type { EntityBrain } from '../../entity-types';
import { directionToPlayer, distanceToPlayer } from '../../entity-sdk';

const wolfBrain: EntityBrain = {
  decide(sensor) {
    if ((!sensor.ground && !sensor.swimming) || !sensor.near(560)) return { action: 'idle' };
    if (distanceToPlayer(sensor) > 560) return { action: 'wander', velocityX: 0 };
    return {
      action: 'chase',
      velocityX: directionToPlayer(sensor) * 82,
      velocityY: distanceToPlayer(sensor) < 110 ? -180 : undefined,
    };
  },
};

export default wolfBrain;
