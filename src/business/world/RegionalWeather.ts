/** One signed dose per half second. Sleeping chunks recover the recent storm
 * on activation without generating terrain beyond the explored world. */
export interface WeatherRecord {
  ticks: number;
  carry: number;
  doses: number[];
  visits: [number, number][];
}

export class RegionalWeather {
  ticks = 0;
  private doses: number[] = [];
  private visits = new Map<number, number>();
  private carry = 0;

  advance(rain: number, sun: number) {
    this.ticks++;
    const dose = rain > 0 ? rain * 5 : -sun * 8;
    this.carry += dose;
    const whole = Math.trunc(this.carry);
    this.carry -= whole;
    this.doses.push(whole);
    if (this.doses.length > 240) this.doses.shift();
    if (this.ticks % 240 === 0) for (const [chunk, last] of this.visits) {
      if (last <= this.ticks - this.doses.length) this.visits.delete(chunk);
    }
  }

  dosesFor(chunk: number) {
    const missed = Math.min(this.doses.length, this.ticks - (this.visits.get(chunk) ?? 0));
    this.visits.set(chunk, this.ticks);
    const spells: number[] = [];
    for (let i = this.doses.length - missed; i < this.doses.length; i++) {
      const dose = this.doses[i];
      if (!dose) continue;
      const last = spells.length - 1;
      if (Math.sign(spells[last]) === Math.sign(dose)) spells[last] += dose;
      else spells.push(dose);
    }
    return spells;
  }

  save(): WeatherRecord {
    return { ticks: this.ticks, carry: this.carry, doses: [...this.doses],
      visits: [...this.visits].filter(([, last]) => this.ticks - last < this.doses.length) };
  }

  restore(record: WeatherRecord) {
    this.ticks = record.ticks;
    this.carry = record.carry;
    this.doses = [...record.doses];
    this.visits = new Map(record.visits);
  }
}
