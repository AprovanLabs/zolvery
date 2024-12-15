/**
 * Seeded random generator for common game pieces
 * 
 * Adapted from https://github.com/lefun-fun/lefun/blob/main/packages/game/src/random.ts
 */
export class Random {
  constructor(private seed: number = 1) {}

  private random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  dice(faces: number): number;
  dice(faces: number, n: number): number[];
  dice(faces: number, n?: number) {
    const onlyOne = typeof n === 'undefined';
    const dice = Array(onlyOne ? 1 : n)
      .fill(undefined)
      .map(() => 1 + Math.floor(this.random() * faces));

    if (onlyOne) {
      return dice[0];
    }
    return dice;
  }

  d6(): number;
  d6(n: number): number[];
  d6(n?: number): number | number[] {
    return n === undefined ? this.dice(6) : this.dice(6, n);
  }

  d2(): number;
  d2(n: number): number[];
  d2(n?: number): number | number[] {
    return n === undefined ? this.dice(2) : this.dice(2, n);
  }

  bernoulli(p?: number): boolean;
  bernoulli(p: number, n: number): boolean[];
  bernoulli(p = 0.5, n?: number): boolean | boolean[] {
    const onlyOne = n === undefined;
    const results = Array(onlyOne ? 1 : n)
      .fill(undefined)
      .map(() => this.random() < p);

    if (onlyOne) {
      return results[0];
    }
    return results;
  }

  coin(): boolean;
  coin(n: number): boolean[];
  coin(n?: number): boolean | boolean[] {
    return n === undefined ? this.bernoulli() : this.bernoulli(0.5, n);
  }
}
