/**
 * Seeded random generator for common game pieces
 *
 * Adapted from https://github.com/lefun-fun/lefun/blob/main/packages/game/src/random.ts
 */
export class Random {
  public constructor(private seed: number = 1) {}

  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  public dice(faces: number): number;
  public dice(faces: number, n: number): number[];
  public dice(faces: number, n?: number) {
    const onlyOne = typeof n === 'undefined';
    const dice = Array(onlyOne ? 1 : n)
      .fill(undefined)
      .map(() => 1 + Math.floor(this.random() * faces));

    if (onlyOne) {
      return dice[0];
    }
    return dice;
  }

  public d6(): number;
  public d6(n: number): number[];
  public d6(n?: number): number | number[] {
    return n === undefined ? this.dice(6) : this.dice(6, n);
  }

  public d2(): number;
  public d2(n: number): number[];
  public d2(n?: number): number | number[] {
    return n === undefined ? this.dice(2) : this.dice(2, n);
  }

  public bernoulli(p?: number): boolean;
  public bernoulli(p: number, n: number): boolean[];
  public bernoulli(p = 0.5, n?: number): boolean | boolean[] {
    const onlyOne = n === undefined;
    const results = Array(onlyOne ? 1 : n)
      .fill(undefined)
      .map(() => this.random() < p);

    if (onlyOne) {
      return results[0];
    }
    return results;
  }

  public coin(): boolean;
  public coin(n: number): boolean[];
  public coin(n?: number): boolean | boolean[] {
    return n === undefined ? this.bernoulli() : this.bernoulli(0.5, n);
  }
}
