import type { Command, CommandResult, CommandSource } from './Command';

export type PlacementMode = 'free' | 'approach';

export interface PlacementCommandContext {
  applyPlacementMode(mode: PlacementMode, source: CommandSource): CommandResult;
}

export class SetPlacementModeCommand implements Command<PlacementCommandContext> {
  readonly name = 'placement';

  constructor(readonly mode: PlacementMode, readonly source: CommandSource) {}

  execute(context: PlacementCommandContext) {
    return context.applyPlacementMode(this.mode, this.source);
  }
}

export function registerPlacementCommand<C extends PlacementCommandContext>(
  bus: import('./CommandBus').CommandBus<C>,
) {
  bus.register('placement', {
    usage: '/placement <livre|aproximacao>',
    description: 'Escolhe a colocação livre ou por aproximação na direção da mira.',
    create(args, source) {
      const value = args[0]?.toLowerCase();
      const mode = value === 'livre' ? 'free' : value === 'aproximacao' ? 'approach' : undefined;
      if (args.length !== 1 || !mode)
        throw new Error('Uso: /placement <livre|aproximacao>');
      return new SetPlacementModeCommand(mode, source);
    },
  });
  return bus;
}
