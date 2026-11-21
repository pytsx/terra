import type { Movement } from '../business';
export class Input {
  private readonly keys = new Set<string>();
  private jump = false;
  private primary = false;
  private hitQueued = false;
  private secondary = false;
  private placeQueued = false;
  private cursor = { x: 0.5, y: 0.5 };
  constructor(
    canvas: HTMLCanvasElement,
    private readonly enabled: () => boolean,
    private readonly interact: () => boolean,
  ) {
    canvas.addEventListener('pointermove', (e) => this.point(e, canvas));
    canvas.addEventListener('pointerdown', (e) => {
      if (!this.enabled()) return;
      this.point(e, canvas);
      if (e.button === 2 && this.interact()) {
        e.preventDefault();
        return;
      }
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      if (e.button === 0) {
        this.primary = true;
        this.hitQueued = true;
      }
      if (e.button === 2) {
        this.secondary = true;
        this.placeQueued = true;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.primary = false;
      if (e.button === 2) this.secondary = false;
    });
    canvas.addEventListener('pointercancel', () => this.clear());
    canvas.addEventListener('lostpointercapture', () => {
      this.primary = false;
      this.secondary = false;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }
  private point(event: PointerEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    this.cursor = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }
  press(e: KeyboardEvent) {
    this.keys.add(e.code);
    if (!e.repeat && ['Space', 'KeyW', 'ArrowUp'].includes(e.code)) this.jump = true;
  }
  clear() {
    this.keys.clear();
    this.hitQueued = false;
    this.primary = false;
    this.secondary = false;
    this.placeQueued = false;
    this.jump = false;
  }
  get pointer() {
    return { ...this.cursor };
  }

  read(aim: { x: number; y: number }) {
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      right = this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      dive = this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      ascend = this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp');
    const movement: Movement = {
      direction: Number(right) - Number(left),
      jump: this.jump,
      dive,
      ascend,
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
    };
    const place = this.placeQueued || this.secondary;
    this.placeQueued = false;
    this.jump = false;
    const mine = this.primary || this.hitQueued;
    this.hitQueued = false;
    return { ...movement, mine, place, aim };
  }
}
