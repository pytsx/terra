import type { EntityBrain } from '../../entity-types';
import { chaseOrWander } from '../../entity-sdk';

const slimeBrain: EntityBrain = {
  decide(sensor) {
    if (!sensor.ground && !sensor.swimming) return { action: 'idle' };
    if (!sensor.near(340)) return { action: 'idle' };
    const movement = chaseOrWander(sensor, 340, 65, 45);
    return {
      ...movement,
      action: 'jump',
      velocityY: -205,
    };
  },
};

export default slimeBrain;
