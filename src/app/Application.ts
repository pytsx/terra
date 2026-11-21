import { InventoryControls } from './InventoryControls';
import { GameService, BELT_SIZE, TILE } from '../business';
import { buildBagModel } from './BagModel';
import { createViews, element, type Views } from '../render';
import { Input } from './Input';
import { PerformanceMonitor } from './PerformanceMonitor';
type Panel = 'menu' | 'inventory' | 'help' | 'new-world' | 'world-map';
export class Application {
  private readonly views: Views = createViews();
  private readonly input = new Input(
    this.views.canvas,
    () => !this.panel && !this.terminalOpen,
    () => {
      if (this.game.interactEntity(this.aim())) {
        this.refresh();
        return true;
      }
      if (!this.game.openWorkbench(this.aim())) return false;
      this.setPanel('inventory');
      return true;
    },
  );
  private readonly inventoryControls = new InventoryControls(
    () => this.game,
    () => this.refresh(),
    this.views.bag,
  );
  private panel: Panel | null = null;
  private terminalOpen = false;
  private readonly commandHistory: string[] = [];
  private historyIndex = 0;
  private previousTime = 0;
  private repaint = true;
  private remainder = 0;
  private hudIn = 0;
  private saveIn = 18;
  private autoSave: boolean;
  private readonly performance = new PerformanceMonitor();
  constructor(private readonly service: GameService) {
    this.autoSave = !service.loadFailed;
    this.views.world.reset(this.game.player, this.game.world, this.game.magnification);
    this.bind();
    if (service.loadFailed) {
      this.views.hud.message('Falha ao ler o save. A expedição começou em memória.');
      element('saveStatus').textContent =
        'Leitura falhou. Use Salvar mundo para gravar esta expedição.';
    }
    this.views.canvas.focus();
    requestAnimationFrame(this.frame);
  }
  private get game() {
    return this.service.game;
  }
  /** Rolling metrics for diagnostics and long-session browser tests. */
  get performanceStats() { return this.performance.snapshot(); }
  private aim() {
    return this.views.world.aim(this.input.pointer, this.game.magnification);
  }
  private refresh() {
    const scene = this.game.scene(this.aim());
    this.views.hud.update(scene, this.game.hotbar);
    this.views.world.drawMinimap(scene);
    if (this.panel === 'world-map') {
      this.views.map.open(scene);
      element('mapSeed').textContent = scene.world.seed;
      element('mapPosition').textContent =
        'Sua posição · ' +
        Math.floor((scene.player.x + scene.player.w / 2) / TILE) +
        ' / ' +
        Math.floor((scene.player.y + scene.player.h / 2) / TILE);
    }
    if (this.panel === 'menu') {
      const goals = this.game.objectives;
      element('goalDepth').textContent = goals.depth + ' / 24 m';
      element('goalBuild').textContent = goals.build + ' / 10';
    }
    if (this.panel === 'inventory') this.views.bag.draw(buildBagModel(this.game));
  }
  private setPanel(next: Panel | null) {
    if (next && this.terminalOpen) this.setTerminal(false);
    if (this.panel === 'inventory') {
      this.game.closeCraft();
      this.inventoryControls.reset();
    }
    if (this.panel) element<HTMLDialogElement>(this.panel).close();
    this.repaint = true;
    this.panel = next;
    this.remainder = 0;
    this.input.clear();
    if (next) {
      if (next === 'inventory') element('bagFeedback').textContent = '';
      if (next === 'new-world') element<HTMLInputElement>('seedInput').value = this.game.world.seed;
      element<HTMLDialogElement>(next).showModal();
      this.refresh();
    } else this.views.canvas.focus();
  }
  private toggle(panel: Panel) {
    this.setPanel(this.panel === panel ? null : panel);
  }
  private terminalLine(text: string, kind: 'command' | 'success' | 'error' = 'success') {
    const output = element('terminalOutput');
    const line = document.createElement('div');
    line.className = `terminal-line ${kind}`;
    line.textContent = text;
    output.append(line);
    while (output.childElementCount > 80) output.firstElementChild?.remove();
    output.scrollTop = output.scrollHeight;
  }
  private setTerminal(open: boolean) {
    if (open && this.panel) return;
    this.terminalOpen = open;
    this.input.clear();
    const terminal = element('gameTerminal');
    terminal.hidden = !open;
    if (open) {
      if (!element('terminalOutput').childElementCount)
        this.terminalLine('Terminal pronto. Digite /help para listar os comandos.');
      const input = element<HTMLInputElement>('terminalInput');
      input.value = '';
      input.focus();
    } else if (!this.panel) this.views.canvas.focus();
  }
  private async save(manual = false) {
    try {
      await this.service.save();
      this.autoSave = true;
      element('saveStatus').textContent = 'Mundo salvo neste navegador';
      if (manual) this.views.hud.message('Expedição salva.');
    } catch {
      element('saveStatus').textContent = 'Falha ao salvar. O progresso continua em memória.';
      this.views.hud.message('Falha ao salvar o mundo neste navegador.');
    }
  }
  private zoom(value: number) {
    this.game.setZoom(value);
    this.refresh();
  }
  private async fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      this.views.hud.message('Tela cheia indisponível neste navegador.');
    }
  }
  private click = (event: MouseEvent) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled) return;
    const d = button.dataset;
    if (d.action) {
      switch (d.action) {
        case 'close':
          this.setPanel(null);
          return;
        case 'menu':
        case 'inventory':
        case 'help':
        case 'world-map':
        case 'new-world':
          this.setPanel(d.action);
          return;
        case 'save':
          void this.save(true);
          return;
        case 'audio':
          button.disabled = true;
          void this.views.audio.toggle().then((enabled) => {
            button.setAttribute('aria-pressed', String(enabled));
            button.textContent = 'Som dos impactos · ' + (enabled ? 'ligado' : 'desligado');
          }).catch(() => { button.textContent = 'Áudio indisponível'; })
            .finally(() => { button.disabled = false; });
          return;
        case 'fullscreen':
          void this.fullscreen();
          return;
        case 'zoom-in':
          this.zoom(this.game.magnification + 0.1);
          return;
        case 'zoom-out':
          this.zoom(this.game.magnification - 0.1);
          return;
        case 'map-zoom-in':
          this.views.map.zoomBy(1.35);
          return;
        case 'map-zoom-out':
          this.views.map.zoomBy(1 / 1.35);
          return;
        case 'map-center':
          this.views.map.focusPlayer();
          return;
        case 'random':
          element<HTMLInputElement>('seedInput').value =
            'MUNDO-' + Math.floor(100000 + Math.random() * 900000);
          return;
      }
    }
    if (d.slot !== undefined) {
      this.game.select(Number(d.slot));
      this.refresh();
      this.views.canvas.focus();
      return;
    }
  };
  private key = (event: KeyboardEvent) => {
    const code = event.code;
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (this.terminalOpen) {
      if (code === 'Escape') {
        event.preventDefault();
        this.setTerminal(false);
      }
      return;
    }
    if (event.target instanceof HTMLInputElement && code !== 'Escape') return;
    if (code === 'KeyT' && !this.panel) {
      event.preventDefault();
      if (!event.repeat) this.setTerminal(true);
      return;
    }
    if (code === 'Escape' || code === 'KeyP') {
      event.preventDefault();
      if (!event.repeat) this.setPanel(this.panel ? null : 'menu');
      return;
    }
    if (code === 'KeyM' && !this.panel) {
      event.preventDefault();
      if (!event.repeat) {
        this.game.togglePlacementMode();
        this.refresh();
      }
      return;
    }
    if (code === 'KeyG') {
      event.preventDefault();
      if (!event.repeat) this.toggle('world-map');
      return;
    }
    if (['KeyE', 'KeyI', 'KeyH'].includes(code)) {
      event.preventDefault();
      if (!event.repeat) this.toggle(code === 'KeyH' ? 'help' : 'inventory');
      return;
    }
    if (this.panel) return;
    if (event.target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(code)) return;
    if (['Space', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code))
      event.preventDefault();
    this.input.press(event);
    if (event.repeat) return;
    if (/^Digit[1-9]$/.test(code)) {
      this.game.select(Number(code.slice(5)) - 1);
      this.refresh();
    }
    if (code === 'KeyR') this.game.consumeSelected();
    if (code === 'KeyQ') this.game.dropSelected();
    if (code === 'Equal' || code === 'NumpadAdd') this.zoom(this.game.magnification + 0.1);
    if (code === 'Minus' || code === 'NumpadSubtract') this.zoom(this.game.magnification - 0.1);
    if (code === 'Digit0') this.zoom(1);
  };
  private bind() {
    document.addEventListener('click', this.click);
    window.addEventListener('keydown', this.key);
    element('terminalForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = element<HTMLInputElement>('terminalInput');
      const command = input.value.trim();
      if (!command) return;
      this.terminalLine(`› ${command}`, 'command');
      const result = this.game.executeCommand(command);
      this.terminalLine(result.message, result.ok ? 'success' : 'error');
      this.commandHistory.push(command);
      if (this.commandHistory.length > 40) this.commandHistory.shift();
      this.historyIndex = this.commandHistory.length;
      input.value = '';
      this.repaint = true;
      this.refresh();
    });
    const terminalInput = element<HTMLInputElement>('terminalInput');
    terminalInput.addEventListener('keydown', (event) => {
      if (event.code !== 'ArrowUp' && event.code !== 'ArrowDown') return;
      event.preventDefault();
      this.historyIndex = event.code === 'ArrowUp'
        ? Math.max(0, this.historyIndex - 1)
        : Math.min(this.commandHistory.length, this.historyIndex + 1);
      terminalInput.value = this.commandHistory[this.historyIndex] ?? '';
    });
    for (const dialog of document.querySelectorAll('dialog'))
      dialog.addEventListener('cancel', (e) => {
        e.preventDefault();
        this.setPanel(null);
      });
    this.views.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (this.panel) return;
        if (e.ctrlKey || e.shiftKey) {
          this.zoom(this.game.magnification + (e.deltaY < 0 ? 0.08 : -0.08));
          return;
        }
        this.game.select((this.game.slot + (e.deltaY > 0 ? 1 : -1) + BELT_SIZE) % BELT_SIZE);
        this.refresh();
      },
      { passive: false },
    );
    element('seedForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.service.newWorld(
        element<HTMLInputElement>('seedInput').value.trim() ||
          'MUNDO-' + Date.now().toString(36).slice(-6).toUpperCase(),
      );
      this.views.world.reset(this.game.player, this.game.world, this.game.magnification);
      this.setPanel(null);
      this.refresh();
      this.autoSave = true;
      this.saveIn = 18;
      void this.save();
      this.views.hud.message('Mundo gerado: ' + this.game.world.seed);
    });
    window.addEventListener('resize', () => {
      this.repaint = true;
      this.views.world.resize();
      this.views.world.follow(this.game.player, this.game.world, Infinity, this.game.magnification);
      if (this.panel === 'world-map') this.refresh();
    });
    const flush = () => {
      if (this.autoSave) void this.save();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.input.clear();
        this.previousTime = 0;
        flush();
      }
    });
    window.addEventListener('pagehide', flush);
  }
  private frame = (time: number) => {
    const frameStarted = performance.now();
    let simulationMs = 0, renderingMs = 0;
    const dt = this.previousTime ? Math.min(0.08, (time - this.previousTime) / 1000) : 0;
    this.previousTime = time;
    if (!this.panel) {
      const simulationStarted = performance.now();
      this.remainder += dt;
      let processBlockFrame = true;
      while (this.remainder >= 1 / 60) {
        this.game.step(1 / 60, this.input.read(this.aim()), processBlockFrame);
        processBlockFrame = false;
        this.remainder -= 1 / 60;
      }
      this.views.world.follow(this.game.player, this.game.world, dt, this.game.magnification);
      for (const event of this.game.drainEvents()) {
        if (event.type === 'message') this.views.hud.message(event.text);
        else {
          this.views.world.effect(event);
          this.views.audio.play(event);
        }
      }
      this.views.world.animate(dt);
      simulationMs = performance.now() - simulationStarted;
      this.saveIn -= dt;
      if (this.saveIn <= 0) {
        this.saveIn = 18;
        if (this.autoSave) void this.save();
      }
    }
    if (!this.panel || this.repaint) {
      const renderingStarted = performance.now();
      this.views.world.draw(this.game.scene(this.aim()), !!this.panel);
      renderingMs = performance.now() - renderingStarted;
      this.repaint = false;
    }
    this.hudIn -= dt;
    if (this.hudIn <= 0) {
      if (!this.panel) this.refresh();
      this.hudIn = 0.16;
    }
    this.performance.record(time && this.previousTime ? dt * 1000 : performance.now() - frameStarted,
      simulationMs, renderingMs);
    requestAnimationFrame(this.frame);
  };
}
