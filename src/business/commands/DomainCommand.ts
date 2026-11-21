import type { CommandBus } from './CommandBus';

/** One typed receiver per action. Callers supply only the action's arguments. */
export function defineCommand<Args extends unknown[], Result>(
  name: string, receive: (...args: Args) => Result,
) {
  return (...args: Args) => ({ name, args, execute: () => receive(...args) });
}

/** Terminal syntax and feedback adapt the same command used by gameplay. */
export function exposeCommand<C, Args extends unknown[], Result>(
  bus: CommandBus<C>, name: string, usage: string, description: string,
  create: (...args: Args) => { name: string; execute(): Result },
  parse: (tokens: readonly string[]) => Args,
  feedback: (value: Result) => { ok: boolean; message: string },
) {
  bus.register(name, { usage, description, create(tokens, source) {
    const command = create(...parse(tokens));
    return { name, source, execute: () => feedback(bus.run(command)) };
  } });
}
