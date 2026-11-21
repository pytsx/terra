type Stage = 'calf' | 'adult' | 'courting' | 'recovering';
interface Transitions {
  feed?: Stage;
  mate?: Stage;
  timeout?: Stage;
}

const transitions: Record<Stage, Transitions> = {
  calf: { timeout: 'adult' },
  adult: { feed: 'courting' },
  courting: { mate: 'recovering', timeout: 'adult' },
  recovering: { timeout: 'adult' },
};

export class BreedingCycle {
  private stage: Stage;
  private remaining: number;

  constructor(private readonly config: { cooldown: number; growthTime: number }, baby: boolean) {
    this.stage = baby ? 'calf' : 'adult';
    this.remaining = baby ? config.growthTime : 0;
  }

  get baby() { return this.stage === 'calf'; }
  get inLove() { return this.stage === 'courting'; }

  feed() {
    const next = transitions[this.stage].feed;
    if (!next) return false;
    this.stage = next;
    this.remaining = this.config.cooldown;
    return true;
  }

  mate(other: BreedingCycle) {
    const next = transitions[this.stage].mate;
    const partnerNext = transitions[other.stage].mate;
    if (this === other || !next || !partnerNext) return false;
    this.stage = next;
    other.stage = partnerNext;
    return true;
  }

  step(dt: number) {
    const next = transitions[this.stage].timeout;
    if (!next) return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) this.stage = next;
  }
}
