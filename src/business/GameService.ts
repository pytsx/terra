import { Expedition } from './Expedition';
import type { SaveRepository } from './save';
export class GameService {
  private constructor(
    private readonly repository: SaveRepository,
    private current: Expedition,
    readonly loadFailed: boolean,
  ) {}
  static async open(repository: SaveRepository) {
    try {
      const saved = await repository.load();
      return new GameService(
        repository,
        new Expedition(saved?.seed ?? 'AURORA-1264', saved ?? undefined),
        false,
      );
    } catch {
      return new GameService(repository, new Expedition('AURORA-1264'), true);
    }
  }
  get game() {
    return this.current;
  }
  newWorld(seed: string) {
    const zoom = this.current.magnification;
    this.current = new Expedition(seed);
    this.current.setZoom(zoom);
  }
  private writing: Promise<void> | undefined;
  save() {
    const snapshot = this.current.save();
    const write = () => this.repository.write(snapshot);
    // Mantém a ordem mesmo quando um provedor remoto demora a gravar.
    const pending = this.writing ? this.writing.then(write, write) : write();
    this.writing = pending;
    const clear = () => {
      if (this.writing === pending) this.writing = undefined;
    };
    pending.then(clear, clear);
    return pending;
  }
}
