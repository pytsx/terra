import type { Command, CommandDefinition, CommandResult, CommandSource } from './Command';

export class CommandBus<Context> {
  private readonly definitions = new Map<string, CommandDefinition<Context>>();

  constructor(private readonly context: Context) {}

  run<Result>(command: { readonly name: string; execute(context: Context): Result }): Result {
    return command.execute(this.context);
  }

  register(name: string, definition: CommandDefinition<Context>) {
    const normalized = name.trim().toLowerCase();
    if (!normalized || this.definitions.has(normalized))
      throw new Error(`Comando inválido ou duplicado: ${name}`);
    this.definitions.set(normalized, definition);
    return this;
  }

  dispatch(command: Command<Context>) {
    try {
      return this.run(command);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : `Falha ao executar /${command.name}.`,
      } satisfies CommandResult;
    }
  }

  executeLine(line: string, source: CommandSource = 'player'): CommandResult {
    const input = line.trim();
    if (!input.startsWith('/'))
      return { ok: false, message: 'Comandos devem começar com /. Digite /help.' };
    const tokens = input.slice(1).match(/"[^"]*"|'[^']*'|\S+/g)?.map(token =>
      token.replace(/^(["'])|(["'])$/g, '')) ?? [];
    const name = tokens.shift()?.toLowerCase();
    if (!name) return { ok: false, message: 'Digite /help para listar os comandos.' };
    if (name === 'help') return { ok: true, message: this.help() };
    const definition = this.definitions.get(name);
    if (!definition)
      return { ok: false, message: `Comando desconhecido: /${name}. Digite /help.` };
    try {
      return this.dispatch(definition.create(tokens, source));
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : `Uso: ${definition.usage}`,
      };
    }
  }

  help() {
    return [...this.definitions.values()]
      .map(definition => `${definition.usage} — ${definition.description}`)
      .join('\n');
  }
}
