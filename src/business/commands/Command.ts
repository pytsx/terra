export type CommandSource = 'player' | 'system';

export interface CommandResult {
  readonly ok: boolean;
  readonly message: string;
  readonly silent?: boolean;
}

export interface Command<Context> {
  readonly name: string;
  readonly source: CommandSource;
  execute(context: Context): CommandResult;
}

export interface CommandDefinition<Context> {
  readonly usage: string;
  readonly description: string;
  create(args: readonly string[], source: CommandSource): Command<Context>;
}
