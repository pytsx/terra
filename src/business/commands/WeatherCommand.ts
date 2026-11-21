import type { Command, CommandResult, CommandSource } from './Command';

export type WeatherMode = 'natural' | 'rain' | 'sun';

export interface WeatherCommandContext {
  applyWeatherMode(mode: WeatherMode, source: CommandSource): CommandResult;
}

export class SetWeatherCommand implements Command<WeatherCommandContext> {
  readonly name = 'weather';
  constructor(readonly mode: WeatherMode, readonly source: CommandSource) {}
  execute(context: WeatherCommandContext) {
    return context.applyWeatherMode(this.mode, this.source);
  }
}

export function registerWeatherCommand<C extends WeatherCommandContext>(
  bus: import('./CommandBus').CommandBus<C>,
) {
  bus.register('weather', {
    usage: '/weather <rain|sun|natural>',
    description: 'Controla o clima ou devolve o controle ao ciclo natural.',
    create(args, source) {
      const mode = args[0]?.toLowerCase();
      if (args.length !== 1 || !['rain', 'sun', 'natural'].includes(mode))
        throw new Error('Uso: /weather <rain|sun|natural>');
      return new SetWeatherCommand(mode as WeatherMode, source);
    },
  });
  return bus;
}
