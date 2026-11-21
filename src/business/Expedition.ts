import { defineCommand, exposeCommand } from './commands/DomainCommand';
import { DroppedItems } from './entities/DroppedItems';
import { tracePlacement, traceTool } from './toolTarget';
import {
  B,
  BLOCKS,
  ITEMS,
  BELT_SIZE,
  BLOCK_SCRIPTS,
  ITEM_ASSETS,
  placedTile,
  TILE,
  type SlotRef,
} from './catalog';
import { World, type TerrainView } from './world/World';
import { Explorer, type Movement } from './entities/Explorer';
import { EntityRegistry, type EngineEntity } from './entities/EntityRegistry';
import { Inventory } from './inventory/Inventory';
import { RNG, clamp } from '../shared/math';
import type { ExpeditionSave } from './save';
import { rainIntensity } from './weather';
import { SimulationRegion } from './simulation/SimulationRegion';
import { EntityUpdateGroup } from './simulation/EntityUpdateGroup';
import { GAME_DAY_SECONDS } from './time';
import {
  CommandBus,
  SetPlacementModeCommand,
  SetWeatherCommand,
  registerPlacementCommand,
  registerWeatherCommand,
  type CommandResult,
  type CommandSource,
  type PlacementCommandContext,
  type PlacementMode,
  type WeatherCommandContext,
  type WeatherMode,
} from './commands';

export interface Point {
  x: number;
  y: number;
}
export type { DroppedItem } from './entities/DroppedItems';
export interface Controls extends Movement {
  mine: boolean;
  place: boolean;
  aim: Point;
}
export type GameEvent =
  | { type: 'message'; text: string }
  | { type: 'impact'; position: Point; block: number }
  | { type: 'entityHit'; position: Point }
  | { type: 'mineHit'; position: Point; block: number; tx: number; ty: number };
const lightItems = Object.keys(ITEMS).filter((id) => ITEMS[id].tool?.role === 'light');
const upgradedPicks = Object.keys(ITEMS).filter((id) =>
  ITEMS[id].tool?.role === 'mining' && (ITEMS[id].tool?.miningMultiplier ?? 1) > 1);

export class Expedition {
  private readonly terrain: World;
  private readonly explorer: Explorer;
  private readonly bag: Inventory;
  private readonly rng: RNG;
  private mobs: EngineEntity[] = [];
  private events: GameEvent[] = [];
  private elapsed: number;
  private selected: number;
  private zoom: number;
  private spawnIn = 17;
  private attackDelay = 0;
  private placeDelay = 0;
  private placeHeld = false;
  private readonly drops: DroppedItems;
  private readonly commands: CommandBus<WeatherCommandContext & PlacementCommandContext>;
  private readonly actions = {
    build: defineCommand('build', this.buildAtAim.bind(this)),
    setZoom: defineCommand('setZoom', this.performSetZoom.bind(this)),
    select: defineCommand('select', this.performSelect.bind(this)),
    moveStack: defineCommand('moveStack', this.performMoveStack.bind(this)),
    clickStack: defineCommand('clickStack', this.performClickStack.bind(this)),
    distributeStack: defineCommand('distributeStack', this.performDistributeStack.bind(this)),
    takeResult: defineCommand('takeResult', this.performTakeResult.bind(this)),
    fillRecipe: defineCommand('fillRecipe', this.performFillRecipe.bind(this)),
    openWorkbench: defineCommand('openWorkbench', this.performOpenWorkbench.bind(this)),
    closeCraft: defineCommand('closeCraft', this.performCloseCraft.bind(this)),
    dropSelected: defineCommand('dropSelected', this.performDropSelected.bind(this)),
    consumeSelected: defineCommand('consumeSelected', this.performConsumeSelected.bind(this)),
    interactEntity: defineCommand('interactEntity', this.performInteractEntity.bind(this)),
    spawn: defineCommand('spawn', this.performSpawn.bind(this)),
    place: defineCommand('place', this.performPlace.bind(this)),
    quickPlace: defineCommand('quickPlace', this.performQuickPlace.bind(this)),
    explore: defineCommand('explore', this.performExplore.bind(this)),
    useTool: defineCommand('useTool', this.performUseTool.bind(this)),
    step: defineCommand('step', this.performStep.bind(this)),
    spawnDrop: defineCommand('spawnDrop', (...args: Parameters<DroppedItems['spawn']>) => this.drops.spawn(...args)),
    collect: defineCommand('collect', (...args: Parameters<Inventory['collect']>) => this.bag.collect(...args)),
    damagePlayer: defineCommand('damagePlayer', (x: number) => this.explorer.damage(x, this.terrain)),
    hitEntity: defineCommand('hitEntity', (mob: EngineEntity, face: number, damage: number) => mob.hit(face, damage)),
    breed: defineCommand('breed', (a: EngineEntity, b: EngineEntity) => a.mate?.(b)),
  };
  private weatherMode: WeatherMode;
  private placementMode: PlacementMode;
  private weatherUntil = 0;
  private raining = false;
  private readonly entityUpdates = new EntityUpdateGroup<EngineEntity>();
  private activeEntityCount = 0;
  private swing: { item: string; angle: number; started: number; duration: number } | null = null;

  constructor(seed: string, save?: ExpeditionSave) {
    this.terrain = new World(
      seed.trim().slice(0, 40) || 'AURORA-1264',
      save?.generationVersion,
    );
    if (save) {
      this.terrain.importExploration(save.exploration ?? []);
      this.terrain.importEdits(save.edits);
      this.terrain.restoreNaturalCells(save.naturalCells ?? save.ecologicalSoil ?? []);
      this.terrain.transformations.restore(save.transformations ?? []);
      this.terrain.hydrology.restore(save.water ?? []);
      if (save.weather) this.terrain.hydrology.weather.restore(save.weather);
      this.terrain.restoreDamage(save.damage ?? []);
    }
    this.explorer = new Explorer(this.terrain, save?.player);
    this.commands = registerPlacementCommand(registerWeatherCommand(
      new CommandBus<WeatherCommandContext & PlacementCommandContext>(this),
    ));
    this.explore();
    this.bag = new Inventory(save?.slots, save?.equipment);
    this.explorer.syncMaxLife(this.bag.maxLife(), !save);
    this.selected = save?.selected ?? 0;
    this.elapsed = save?.elapsed ?? 0;
    this.zoom = save?.zoom ?? 1;
    this.placementMode = save?.placementMode ?? 'approach';
    this.drops = new DroppedItems(save?.drops);
    this.terrain.onItemProduced(({ item, amount, x, y }) => this.drops.spawn({ item, amount, x, y }));
    this.rng = new RNG(this.terrain.h ^ 0x77b09);
    this.weatherMode = save?.weatherMode ?? 'natural';
    this.raining = save?.raining ?? (this.weatherMode === 'rain' ||
      (this.weatherMode === 'natural' && rainIntensity(this.elapsed, this.terrain.h, 0) > 0));
    this.weatherUntil = save?.weatherUntil ?? (this.weatherMode === 'natural' ? 0 : this.elapsed + 75);
    if (save?.weatherUntil === undefined && this.weatherMode === 'natural' && this.raining)
      this.commands.dispatch(new SetWeatherCommand('rain', 'system'));
    this.registerTerminalActions();
    this.spawn();
  }
  private registerTerminalActions() {
    const none = (args: readonly string[]): [] => {
      if (args.length) throw new Error('Este comando não recebe argumentos.');
      return [];
    };
    const index = (limit: number) => (args: readonly string[]): [number] => {
      const value = Number(args[0]);
      if (args.length !== 1 || !Number.isSafeInteger(value) || value < 1 || value > limit)
        throw new Error('Escolha um número de 1 a ' + limit + '.');
      return [value - 1];
    };
    const result = (ok: boolean) => ({ ok, message: ok ? 'Ação realizada.' : 'Ação indisponível.' });
    exposeCommand(this.commands, 'drop', '/drop', 'Soltar uma unidade.', this.actions.dropSelected, none, result);
    exposeCommand(this.commands, 'consume', '/consume', 'Consumir o item selecionado.', this.actions.consumeSelected, none, result);
    exposeCommand(this.commands, 'select', '/select <slot>', 'Selecionar um slot da barra.', this.actions.select,
      index(BELT_SIZE), () => result(true));
    exposeCommand(this.commands, 'spawn', '/spawn', 'Tentar gerar criaturas segundo as regras locais.', this.actions.spawn,
      none, count => ({ ok: count > 0, message: 'Criaturas geradas: ' + count }));
    exposeCommand(this.commands, 'build', '/build <x> <y>', 'Construir mirando nas coordenadas de bloco.', this.actions.build,
      (args): [Point] => {
        if (args.length !== 2 || !args.every(arg => /^-?\d+$/.test(arg) && Number.isSafeInteger(Number(arg))))
          throw new Error('Uso: /build <x> <y>');
        return [{ x: (Number(args[0]) + 0.5) * TILE, y: (Number(args[1]) + 0.5) * TILE }];
      }, result);
  }
  get world(): TerrainView {
    return this.terrain;
  }
  get objectives() {
    const p = this.player;
    return { depth: Math.min(24, p.depthMax * 2), build: Math.min(10, p.placed) };
  }
  get slot() {
    return this.selected;
  }
  get magnification() {
    return this.zoom;
  }
  get placement() { return this.placementMode; }
  get player() {
    return this.explorer.view();
  }
  get cursorStack() { return this.bag.held(); }
  get hotbar() { return this.bag.belt(); }
  get inventory() {
    return this.bag.snapshot();
  }
  executeCommand(line: string) {
    return this.commands.executeLine(line, 'player');
  }
  applyWeatherMode(mode: WeatherMode, source: CommandSource): CommandResult {
    this.weatherMode = source === 'system' ? 'natural' : mode;
    this.raining = mode === 'rain' || (mode === 'natural' && rainIntensity(this.elapsed, this.world.h, 0) > 0);
    this.weatherUntil = mode === 'natural' ? 0 : this.elapsed + 60 + 30 *
      (0.5 + 0.5 * Math.sin(this.world.h + Math.floor(this.elapsed)));
    const message = mode === 'rain'
      ? 'Chuva ativada.'
      : mode === 'sun'
        ? 'Céu limpo ativado.'
        : 'Clima devolvido ao ciclo natural.';
    if (source === 'player') this.events.push({ type: 'message', text: message });
    return { ok: true, message };
  }
  applyPlacementMode(mode: PlacementMode, source: CommandSource): CommandResult {
    this.placementMode = mode;
    const label = mode === 'free' ? 'livre' : 'por aproximação';
    const message = `Modo de colocação ${label}.`;
    if (source === 'player') this.events.push({ type: 'message', text: message });
    return { ok: true, message };
  }
  togglePlacementMode() {
    const mode: PlacementMode = this.placementMode === 'free' ? 'approach' : 'free';
    return this.commands.dispatch(new SetPlacementModeCommand(mode, 'player'));
  }
  private rainAt(undergroundDepth: number) {
    if (undergroundDepth > 4 || !this.raining) return 0;
    const exposure = clamp(1 - Math.max(0, undergroundDepth) / 5, 0, 1);
    const biome = this.terrain.biomeAt(Math.floor(this.player.x / TILE));
    return (biome === 'Pradaria' ? 0.65 : biome === 'Bosque de coníferas' ? 0.85 : 1) * exposure;
  }
  setZoom(value: number) {
    return this.commands.run(this.actions.setZoom(value));
  }
  private performSetZoom(value: number) {
    this.zoom = clamp(Math.round(value * 100) / 100, 0.7, 1.65);
  }
  select(index: number) {
    return this.commands.run(this.actions.select(index));
  }
  private performSelect(index: number) {
    if (Number.isInteger(index) && index >= 0 && index < BELT_SIZE) this.selected = index;
  }
  moveStack(from: SlotRef, to: SlotRef, single = false) {
    return this.commands.run(this.actions.moveStack(from, to, single));
  }
  private performMoveStack(from: SlotRef, to: SlotRef, single = false) {
    const moved = this.bag.move(from, to, single);
    if (moved) this.explorer.syncMaxLife(this.bag.maxLife());
    return moved;
  }
  clickStack(ref: SlotRef) {
    return this.commands.run(this.actions.clickStack(ref));
  }
  private performClickStack(ref: SlotRef) {
    const moved = this.bag.click(ref);
    if (moved) this.explorer.syncMaxLife(this.bag.maxLife());
    return moved;
  }
  distributeStack(refs: readonly SlotRef[]) {
    return this.commands.run(this.actions.distributeStack(refs));
  }
  private performDistributeStack(refs: readonly SlotRef[]) { return this.bag.distribute(refs); }
  distributionPreview(refs: readonly SlotRef[]) { return this.bag.distributionPreview(refs); }
  takeResult(to?: SlotRef) {
    return this.commands.run(this.actions.takeResult(to));
  }
  private performTakeResult(to?: SlotRef) {
    return this.bag.takeResult(to);
  }
  fillRecipe(index: number) {
    return this.commands.run(this.actions.fillRecipe(index));
  }
  private performFillRecipe(index: number) { return this.bag.fillRecipe(index); }
  private aimedContact(aim: Point) {
    const p = this.player, dx = aim.x - p.x - p.w / 2, dy = aim.y - p.y - p.h / 2;
    const distance = Math.hypot(dx, dy);
    if (distance > TILE * 5.35) return null;
    return traceTool(this.terrain, { ...p, face: Math.sign(dx) || p.face }, aim, distance, this.mobs).hit;
  }
  openWorkbench(aim: Point) {
    return this.commands.run(this.actions.openWorkbench(aim));
  }
  private performOpenWorkbench(aim: Point) {
    const target = this.aimedContact(aim);
    if (target?.kind !== 'block' || target.tx !== Math.floor(aim.x / TILE) || target.ty !== Math.floor(aim.y / TILE)) return false;
    const result = BLOCK_SCRIPTS[target.id].placed.onInteract?.({ x: target.tx, y: target.ty });
    if (
      typeof result !== 'object' ||
      result === null ||
      !('openCraft' in result) ||
      result.openCraft !== true
    )
      return false;
    this.bag.changeGrid(3);
    return true;
  }
  closeCraft() {
    return this.commands.run(this.actions.closeCraft());
  }
  private performCloseCraft() {
    const unresolved = this.bag.cancelCursorTransaction();
    this.bag.changeGrid(2);
    if (!unresolved) return;
    const p = this.player;
    this.commands.run(this.actions.spawnDrop(
      { ...unresolved, x: p.x + p.w / 2, y: p.y + p.h / 2 },
      p.face * 35,
      -45,
      0.35,
    ));
    this.events.push({
      type: 'message',
      text: `${ITEMS[unresolved.item].name} foi solto porque o inventário está cheio.`,
    });
  }
  dropSelected() {
    return this.commands.run(this.actions.dropSelected());
  }
  private performDropSelected() {
    const held = this.bag.at(this.selected);
    if (!held || !this.bag.use(held.item, this.selected)) {
      this.events.push({ type: 'message', text: 'Nenhum item selecionado para soltar.' });
      return false;
    }
    const p = this.player;
    this.commands.run(this.actions.spawnDrop({
      ...held, amount: 1, x: p.x + p.w / 2 + p.face * 18, y: p.y + p.h - 10,
    }, p.face * 80, -70, 0.35));
    this.events.push({ type: 'message', text: `Soltou ${ITEMS[held.item].name}.` });
    return true;
  }
  consumeSelected() {
    return this.commands.run(this.actions.consumeSelected());
  }
  private performConsumeSelected() {
    const held = this.bag.at(this.selected);
    if (!held) return false;
    const asset = ITEMS[held.item];
    if (!asset.use) {
      this.events.push({ type: 'message', text: `${asset.name} não pode ser consumido.` });
      return false;
    }
    if (!this.bag.use(held.item, this.selected)) return false;
    if (asset.use.effect === 'heal') this.explorer.heal(asset.use.amount);
    this.events.push({
      type: 'message',
      text: `${asset.name} consumido · ${asset.use.amount} vida.`,
    });
    return true;
  }
  interactEntity(aim: Point) {
    return this.commands.run(this.actions.interactEntity(aim));
  }
  private performInteractEntity(aim: Point) {
    const hit = this.aimedContact(aim);
    if (hit?.kind !== 'entity') return false;
    const mob = hit.entity, m = hit.bounds;
    if (aim.x < m.x || aim.x >= m.x + m.w || aim.y < m.y || aim.y >= m.y + m.h) return false;
    const asset = EntityRegistry.asset(String(mob.view().kind));
    if (!asset || !('breeding' in asset.config)) return false;
    const item = asset.config.breeding.item;
    if (!this.bag.count(item) || !mob.feed?.()) return false;
    this.bag.use(item);
    this.events.push({ type: 'message', text: `${asset.config.name} entrou no modo amoroso.` });
    return true;
  }
  private spawn() {
    return this.commands.run(this.actions.spawn());
  }
  private performSpawn() {
    const previous = this.mobs.length;
    const px = Math.floor(this.player.x / TILE);
    for (let i = 0; i < 5 && this.mobs.length < 13; i++) {
      const candidate = px + (this.rng.next() > 0.5 ? 1 : -1) * this.rng.int(13, 40);
      const x = this.world.infinite ? candidate : clamp(candidate, 7, this.world.width - 8);
      const y = this.world.heightAt(x) - 2;
      if (
        this.world.get(x, y) === B.AIR &&
        !this.mobs.some((m) => Math.abs(m.view().x / TILE - x) < 5)
      ) {
        const pool = EntityRegistry.spawnPool(this.world.get(x, y + 2), this.world.biomeAt(x));
        const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
        let roll = this.rng.next() * total;
        let selected = pool[0]?.id;
        for (const entry of pool) {
          roll -= entry.weight;
          if (roll <= 0) {
            selected = entry.id;
            break;
          }
        }
        if (selected) {
          const entity = EntityRegistry.create(selected, x * TILE, y * TILE, this.rng.int(0, 9999));
          if (entity) this.mobs.push(entity);
        }
      }
    }
    return this.mobs.length - previous;
  }
  private adjacent(x: number, y: number) {
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => this.terrain.solid(x + dx, y + dy));
  }
  target(aim: Point) {
    const p = this.player;
    const trace = tracePlacement(this.terrain, p, aim, TILE * 5.35, this.placementMode);
    const { tx, ty } = trace.target;
    const x = tx * TILE,
      y = ty * TILE;
    const reachable = trace.reachable && trace.support !== null;
    const held = this.bag.at(this.selected)?.item;
    const item = held;
    const tile = item ? placedTile(item) : undefined;
    const block = this.world.get(tx, ty);
    const intersects = x < p.x + p.w && x + TILE > p.x && y < p.y + p.h && y + TILE > p.y;
    const canPlace =
      reachable &&
      (block === B.AIR || block === B.WATER) &&
      tile !== undefined &&
      item !== undefined &&
      (!BLOCKS[tile].solid || !intersects) &&
      this.adjacent(tx, ty);
    return {
      tx,
      ty,
      reachable,
      block,
      tile,
      item,
      canPlace,
      support: trace.support,
      mode: this.placementMode,
    };
  }
  private impact(x: number, y: number, block: number) {
    this.events.push({ type: 'impact', position: { x, y }, block });
  }
  private buildAtAim(aim: Point) {
    if (this.placeDelay > 0) return false;
    const target = this.target(aim);
    if (!target.canPlace || !target.item || target.tile === undefined) return false;
    this.place(target.tx, target.ty, target.tile, target.item, this.selected);
    this.placeDelay = 0.13;
    return true;
  }
  private wearHeldTool() {
    const result = this.bag.wearSelected(this.selected);
    if (result?.broken)
      this.events.push({ type: 'message', text: `${ITEMS[result.item].name} quebrou.` });
  }
  private place(tx: number, ty: number, tile: number, item: string, slot?: number) {
    return this.commands.run(this.actions.place(tx, ty, tile, item, slot));
  }
  private performPlace(tx: number, ty: number, tile: number, item: string, slot?: number) {
    if (!this.bag.use(item, slot)) return;
    this.terrain.set(tx, ty, tile);
    this.explorer.recordPlacement();
    if (this.player.placed === 10)
      this.events.push({ type: 'message', text: 'Abrigo construído · 10 blocos colocados.' });
    this.impact((tx + 0.5) * TILE, (ty + 0.5) * TILE, tile);
  }
  quickPlace() {
    return this.commands.run(this.actions.quickPlace());
  }
  private performQuickPlace() {
    const quick = Object.entries(ITEM_ASSETS).find(([, asset]) =>
      'place' in asset.config ? asset.config.place.quickPlace : false,
    );
    if (!quick) return;
    const [itemId, itemAsset] = quick;
    if (!this.bag.count(itemId)) {
      this.events.push({ type: 'message', text: `Fabrique mais ${itemAsset.config.name}.` });
      return;
    }
    const blockKey = 'place' in itemAsset.config ? itemAsset.config.place.block : undefined;
    if (!blockKey) return;
    const tile = B[blockKey as keyof typeof B];
    if (tile === undefined) return;
    const p = this.player,
      x = Math.floor((p.x + p.w / 2) / TILE),
      y = Math.floor((p.y + p.h / 2) / TILE);
    for (const dy of [0, -1, 1])
      for (const dx of [p.face, 0, -p.face]) {
        const tx = x + dx,
          ty = y + dy;
        if (
          this.terrain.inside(tx, ty) &&
          this.world.get(tx, ty) === B.AIR &&
          this.adjacent(tx, ty)
        ) {
          this.place(tx, ty, tile, itemId);
          return;
        }
      }
    this.events.push({
      type: 'message',
      text: 'Aproxime-se de um chão ou parede para fixar a tocha.',
    });
  }
  private toolRay(aim: Point) {
    const held = this.bag.at(this.selected);
    const item = held ? ITEMS[held.item] : undefined;
    const stats = item?.hit ?? item?.tool?.hit ?? { damage: 1, reach: 34, cooldown: 0.42 };
    const ray = traceTool(this.terrain, this.player, aim, stats.reach, this.mobs);
    const multiplier = item?.tool?.miningMultiplier ?? 1;
    const tier = item?.tool?.role === 'mining' ? (item.tool.mineTier ?? 1) : 1;
    let secondsLeft: number | null = null;
    if (ray.hit?.kind === 'block') {
      const { id, tx, ty } = ray.hit,
        block = BLOCKS[id];
      if (block.hardness !== null && tier >= (block.mineTier ?? 1))
        secondsLeft = ((1 - this.terrain.damageAt(tx, ty)) * block.hardness) / multiplier;
    }
    return { ...ray, stats, multiplier, secondsLeft };
  }
  private swingTool(angle: number, duration: number) {
    this.swing = { item: this.bag.at(this.selected)?.item ?? '', angle, started: this.elapsed, duration };
  }
  private explore() {
    return this.commands.run(this.actions.explore());
  }
  private performExplore() {
    const p = this.player;
    this.terrain.exploreAround((p.x + p.w / 2) / TILE, (p.y + p.h / 2) / TILE);
  }
  private useTool(aim: Point, dt: number) {
    return this.commands.run(this.actions.useTool(aim, dt));
  }
  private performUseTool(aim: Point, dt: number) {
    const { hit, angle, stats, secondsLeft, multiplier } = this.toolRay(aim);
    if (!hit) return;
    if (hit.kind === 'entity') {
      if (this.attackDelay > 0) return;
      this.attackDelay = stats.cooldown;
      const mob = hit.entity,
        m = mob.view();
      this.swingTool(angle, Math.min(0.24, stats.cooldown));
      this.commands.run(this.actions.hitEntity(mob, this.player.face, stats.damage));
      this.events.push({ type: 'entityHit', position: { x: m.x + m.w / 2, y: m.y + m.h / 2 } });
      this.wearHeldTool();
      if (mob.dead) {
        const asset = EntityRegistry.asset(String(m.kind));
        for (const drop of asset && 'drops' in asset.config ? asset.config.drops : []) {
          if (!('item' in drop)) continue;
          const amount = drop.min + Math.floor(this.rng.next() * (drop.max - drop.min + 1));
          if (amount <= 0) continue;
          this.commands.run(this.actions.spawnDrop({ item: drop.item, amount, x: m.x + m.w / 2, y: m.y + m.h / 2 },
            (this.rng.next() - 0.5) * 100, -110));
        }
      }
      return;
    }
    const { tx, ty, id } = hit,
      block = BLOCKS[id];
    if (secondsLeft === null) return;
    if (!this.swing || this.swing.item !== (this.bag.at(this.selected)?.item ?? ''))
      this.swingTool(angle, 0.20);
    const before = this.terrain.damageAt(tx, ty);
    const after = this.terrain.mine(tx, ty, dt * multiplier);
    const position = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
    if (after === 1) {
      if (block.drop) this.commands.run(this.actions.spawnDrop({ item: block.drop, amount: 1, ...position }, 0, -32));
      this.wearHeldTool();
      this.impact(position.x, position.y, id);
    } else if (before === 0 || Math.floor(before * 7) !== Math.floor(after * 7)) {
      this.events.push({ type: 'mineHit', position, block: id, tx, ty });
    }
  }
  step(dt: number, controls: Controls, processBlockFrame = true) {
    return this.commands.run(this.actions.step(dt, controls, processBlockFrame));
  }
  private performStep(dt: number, controls: Controls, processBlockFrame = true) {
    this.elapsed += dt;
    const natural = rainIntensity(this.elapsed, this.world.h, 0);
    if (this.elapsed >= this.weatherUntil &&
      (this.weatherMode !== 'natural' || this.raining !== (natural > 0) || this.raining))
      this.commands.dispatch(new SetWeatherCommand(this.raining ? 'sun' : natural > 0 ? 'rain' : 'sun', 'system'));
    if (this.swing && this.elapsed - this.swing.started >= this.swing.duration) this.swing = null;
    this.attackDelay = Math.max(0, this.attackDelay - dt);
    this.placeDelay = Math.max(0, this.placeDelay - dt);
    this.explorer.lookAt(controls.aim.x);
    this.explorer.step(dt, controls, this.terrain);
    this.explore();
    if (controls.mine) this.useTool(controls.aim, dt);
    const placePressed = controls.place && !this.placeHeld;
    this.placeHeld = controls.place;
    if (placePressed) this.commands.run(this.actions.build(controls.aim));
    const p = this.player;
    const region = SimulationRegion.around(p);
    const activeMobs = this.entityUpdates.select(this.mobs, region);
    this.activeEntityCount = activeMobs.length;
    const sunPhase = (this.elapsed / GAME_DAY_SECONDS + 0.18) % 1;
    const sunlight = sunPhase > 0.52 && sunPhase < 0.94 ? 0 : 1;
    this.terrain.stepBlocks(
      dt,
      processBlockFrame,
      region,
      this.rainAt(0),
      sunlight,
      (tx, ty) => {
        const x = tx * TILE,
          y = ty * TILE;
        const overlaps = (actor: { x: number; y: number; w: number; h: number }) =>
          actor.x < x + TILE &&
          actor.x + actor.w > x &&
          actor.y < y + TILE &&
          actor.y + actor.h > y;
        return overlaps(p) || activeMobs.some((m) => overlaps(m.view()));
      },
      (block, tx, ty) => {
        const item = BLOCKS[block].drop;
        if (item)
          this.commands.run(this.actions.spawnDrop({ item, amount: 1, x: (tx + 0.5) * TILE, y: ty * TILE - 6 }, 0, -45));
      },
    );
    this.drops.step(dt, this.terrain, p, ({ item, amount, durability }) => {
      this.commands.run(this.actions.collect(item, amount, durability));
      this.events.push({ type: 'message', text: `Recolheu ${amount} × ${ITEMS[item].name}.` });
    }, drop => region.intersects({ ...drop, w: 10, h: 10 }));
    for (const mob of activeMobs) {
      if (mob.step(dt, this.terrain, p, this.rng, activeMobs, this.elapsed)) {
        const result = this.commands.run(this.actions.damagePlayer(mob.view().x));
        if (result !== 'immune') {
          const broken = this.bag.wearArmor();
          this.explorer.syncMaxLife(this.bag.maxLife());
          for (const item of broken)
            this.events.push({ type: 'message', text: `${ITEMS[item].name} quebrou.` });
        }
        if (result === 'respawn')
          this.events.push({ type: 'message', text: 'Você voltou ao acampamento.' });
      }
    }
    for (let i = 0; i < activeMobs.length; i++) {
      for (let j = i + 1; j < activeMobs.length; j++) {
        const aEntity = activeMobs[i];
        const bEntity = activeMobs[j];
        const a = aEntity.view();
        const b = bEntity.view();
        if (a.kind !== b.kind || !aEntity.inLove || !bEntity.inLove) continue;
        const asset = EntityRegistry.asset(String(a.kind));
        if (!asset || !('breeding' in asset.config)) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > asset.config.breeding.mateRadius) continue;
        const calf = this.commands.run(this.actions.breed(aEntity, bEntity));
        if (calf) {
          this.mobs.push(calf);
          this.events.push({ type: 'message', text: 'Uma nova bezerra nasceu.' });
        }
      }
    }
    this.mobs = this.mobs.filter((m) => !m.dead);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = 17;
      this.mobs = this.mobs.filter(m => m.mate || Math.abs(m.view().x - p.x) < TILE * 90);
      if (this.mobs.length < 9) this.spawn();
    }
  }
  get simulationStats() {
    return {
      activeEntities: this.activeEntityCount,
      ...this.terrain.blockUpdateStats,
    };
  }
  drainEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
  scene(aim: Point) {
    const held = this.bag.at(this.selected)?.item;
    const heldName = held ? ITEMS[held].name : 'Mão livre',
      heldIcon = held ?? '';
    const { hit, angle, secondsLeft } = this.toolRay(aim);
    const playerTileX = Math.floor((this.player.x + this.player.w / 2) / TILE);
    const undergroundDepth = this.player.y / TILE - this.world.heightAt(playerTileX);
    return {
      world: this.world,
      player: this.player,
      equipment: this.bag.saveEquipment(),
      mobs: this.mobs.map((m) => m.view()),
      elapsed: this.elapsed,
      zoom: this.zoom,
      placementMode: this.placementMode,
      rain: this.rainAt(undergroundDepth),
      slot: this.selected,
      target: this.target(aim),
      toolAngle: angle,
      toolTarget: hit
        ? {
            bounds: hit.bounds,
            kind: hit.kind,
            secondsLeft,
            hydration: hit.kind === 'entity' ? hit.entity.view().hydration : undefined,
            nutrition: hit.kind === 'entity' ? hit.entity.view().nutrition : undefined,
            name:
              hit.kind === 'block'
                ? BLOCKS[hit.id].name
                : EntityRegistry.asset(String(hit.entity.view().kind))?.config.name ?? String(hit.entity.view().kind),
          }
        : null,
      swing: this.swing ? {
        item: this.swing.item, angle: this.swing.angle, phase: (this.elapsed - this.swing.started) / this.swing.duration,
      } : null,
      drops: this.drops.visible,
      heldName,
      heldIcon,
      lantern: lightItems.some((id) => this.bag.count(id) > 0),
      copperPick: upgradedPicks.some((id) => this.bag.count(id) > 0),
    };
  }
  save(): ExpeditionSave {
    return {
      version: 4,
      generationVersion: this.terrain.generationVersion,
      seed: this.world.seed,
      edits: this.terrain.exportEdits(),
      naturalCells: this.terrain.exportNaturalCells(),
      transformations: this.terrain.transformations.save(),
      water: this.terrain.hydrology.save(),
      weather: this.terrain.hydrology.weather.save(),
      weatherMode: this.weatherMode,
      weatherUntil: this.weatherUntil,
      raining: this.raining,
      damage: this.terrain.exportDamage(),
      exploration: this.terrain.exportExploration(),
      player: this.explorer.save(),
      slots: this.bag.saveSlots(),
      equipment: this.bag.saveEquipment(),
      elapsed: this.elapsed,
      selected: this.selected,
      zoom: this.zoom,
      placementMode: this.placementMode,
      drops: this.drops.save(),
    };
  }
}
export type Scene = ReturnType<Expedition['scene']>;
