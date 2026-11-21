import { defaultContent } from './assets/runtime';
import './render/game.css';
import './render/inventory.css';
import { Application } from './app/Application';
import { GameService } from './business';
import { createSaveRepository } from './store';
async function start() {
  const service = await GameService.open(createSaveRepository(defaultContent), defaultContent);
  new Application(service);
}
void start();
