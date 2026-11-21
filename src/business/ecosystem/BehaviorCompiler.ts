import type { Behavior } from '../content/ContentPack';
import type { Habitat, Activity } from './Habitat';

export function compileBehaviors(behaviors: readonly Behavior[]) {
  const actions = behaviors.map((behavior): ((habitat: Habitat) => Activity | undefined) => {
    switch (behavior.action) {
      case 'flee':
        if (!behavior.target || !(behavior.radius > 0)) throw new Error('Alvo ou raio de fuga inválido');
        return h => h.flee(behavior.target, behavior.radius) ? 'flee' : undefined;
      case 'graze':
        return h => h.change(0, 0, 'GRASS', 'DIRT') ? 'rest' : undefined;
      case 'activity':
        return h => (behavior.when === 'night' ? h.night : h.rainy) ? behavior.result : undefined;
      default:
        throw new Error('Comportamento desconhecido');
    }
  });
  return (habitat: Habitat): Activity => {
    for (const action of actions) {
      const activity = action(habitat);
      if (activity) return activity;
    }
    return 'walk';
  };
}
