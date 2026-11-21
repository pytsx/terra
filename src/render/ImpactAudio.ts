import { BLOCKS, type GameEvent } from '../business';

/** Optional in-world audio. The menu gesture unlocks the browser's audio context. */
export class ImpactAudio {
  private context?: AudioContext;
  private enabled = false;
  private last = -Infinity;

  async toggle() {
    if (this.enabled) return this.enabled = false;
    this.context ??= new AudioContext();
    await this.context.resume();
    return this.enabled = true;
  }

  play(event: Exclude<GameEvent, { type: 'message' }>) {
    const ctx = this.context;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (event.type === 'mineHit' && now - this.last < 0.065) return;
    this.last = now;
    const hardness = event.type === 'entityHit' ? 0 : (BLOCKS[event.block].hardness ?? 1);
    const freq = 95 + Math.min(2, hardness) * 150;
    const duration = event.type === 'mineHit' ? 0.055 : 0.10;
    const tone = ctx.createOscillator(), gain = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(freq, now);
    tone.frequency.exponentialRampToValueAtTime(freq * 0.38, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    tone.connect(gain).connect(ctx.destination);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    tone.start(now);
    tone.stop(now + duration);
  }
}
