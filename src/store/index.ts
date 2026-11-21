import { defaultContent } from '../assets/runtime';
import type { ExpeditionSave, SaveRepository } from '../business/save';
import { decodeSave } from './codec';
export class LocalStorageRepository implements SaveRepository {
  constructor(private readonly storage: () => Storage = () => window.localStorage, private readonly content = defaultContent) {}
  async load() {
    const storage = this.storage();
    const raw =
      storage.getItem('terra-matriz-save-v4') ??
      storage.getItem('terra-matriz-save-v3') ??
      storage.getItem('terra-matriz-save-v2');
    return raw === null ? null : decodeSave(raw, Number(storage.getItem('terra-matriz-zoom')) || 1, this.content);
  }
  async write(save: ExpeditionSave) {
    this.storage().setItem('terra-matriz-save-v4', JSON.stringify(save));
  }
}
export function createSaveRepository(content = defaultContent): SaveRepository {
  return new LocalStorageRepository(undefined, content);
}
