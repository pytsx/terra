export class Health {
  constructor(private points: number) {}

  get remaining() { return this.points; }
  get depleted() { return this.points === 0; }

  damage(amount: number) {
    this.points = Math.max(0, this.points - amount);
  }
  restore(points: number) {
    if (Number.isFinite(points) && points >= 0) this.points = points;
  }
}
