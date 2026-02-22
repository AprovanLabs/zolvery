import React, { useCallback, useEffect, useMemo } from 'react';

// Adapted from https://github.com/PJohannessen/yatzy

type ScoringCategory =
  | 'ones'
  | 'twos'
  | 'threes'
  | 'fours'
  | 'fives'
  | 'sixes'
  | 'onePair'
  | 'twoPairs'
  | 'threeOfAKind'
  | 'fourOfAKind'
  | 'smallStraight'
  | 'largeStraight'
  | 'fullHouse'
  | 'chance'
  | 'yatzy';

type Scores = Record<ScoringCategory, number | null>;

interface Player {
  id: string;
  name: string;
  isBot: boolean;
  scoring: Scores;
}

interface GameState {
  dice: number[];
  diceHeld: boolean[];
  players: Player[];
  totalRolls: number;
  currentPlayer: number;
  winner: string | null;
  isDraw: boolean;
}

interface BoardProps {
  G: GameState;
  ctx: { currentPlayer: string; numPlayers: number };
  moves: {
    rollDice: () => void;
    selectScore: (category: ScoringCategory) => void;
    toggleDie: (index: number) => void;
    reset: () => void;
  };
  playerID?: string;
  isMultiplayer?: boolean;
  botCount?: number;
}

// Configuration
const TOTAL_DICE = 5;
const BOT_DELAY_MS = 600;

// Player colors using OKLCH for modern color appearance
const PLAYER_COLORS = [
  'oklch(72.3% 0.219 149.579)', // Green - Human
  'oklch(62.3% 0.214 259.815)', // Blue - Bot 1
  'oklch(70.5% 0.213 47.604)', // Orange - Bot 2
  'oklch(65.6% 0.241 354.308)', // Pink - Bot 3
];

// Utility functions
const max = (arr: number[]) =>
  arr.reduce((max, x) => Math.max(x, max), Number.MIN_SAFE_INTEGER);
const sum = (arr: number[]) => arr.reduce((sum, x) => x + sum, 0);
const isEqual = (arr1: number[], arr2: number[]) =>
  arr1.length === arr2.length &&
  arr1.every((val, index) => val === arr2[index]);

const groupBy = (arr: number[]): Record<number, number[]> =>
  arr.reduce(
    (acc, item) => {
      if (!acc[item]) acc[item] = [];
      acc[item].push(item);
      return acc;
    },
    {} as Record<number, number[]>,
  );

const groupDice = (dice: number[]): number[][] => {
  const grouped = groupBy(dice);
  const result: number[][] = [];
  for (let d = 1; d <= 6; d++) {
    if (grouped[d]) result.push(grouped[d]);
  }
  return result.sort((a, b) => b.length - a.length);
};

// Scoring categories metadata
const UPPER_CATEGORIES: ScoringCategory[] = [
  'ones',
  'twos',
  'threes',
  'fours',
  'fives',
  'sixes',
];
const LOWER_CATEGORIES: ScoringCategory[] = [
  'onePair',
  'twoPairs',
  'threeOfAKind',
  'fourOfAKind',
  'smallStraight',
  'largeStraight',
  'fullHouse',
  'chance',
  'yatzy',
];

export const ScoreCalculator = {
  calculateUpperSectionTotal: (player: Player) =>
    UPPER_CATEGORIES.map((cat) => player.scoring[cat] ?? 0).reduce(
      (a, b) => a + b,
      0,
    ),

  calculateUpperSectionBonus: (player: Player) =>
    ScoreCalculator.calculateUpperSectionTotal(player) >= 63 ? 50 : 0,

  calculateLowerSectionTotal: (player: Player) =>
    LOWER_CATEGORIES.map((cat) => player.scoring[cat] ?? 0).reduce(
      (a, b) => a + b,
      0,
    ),

  calculateTotal: (player: Player) => {
    const upper = ScoreCalculator.calculateUpperSectionTotal(player);
    const bonus = ScoreCalculator.calculateUpperSectionBonus(player);
    const lower = ScoreCalculator.calculateLowerSectionTotal(player);
    return upper + bonus + lower;
  },

  calculators: {
    ones: (dice: number[]) => sum(dice.filter((d) => d === 1)),
    twos: (dice: number[]) => sum(dice.filter((d) => d === 2)),
    threes: (dice: number[]) => sum(dice.filter((d) => d === 3)),
    fours: (dice: number[]) => sum(dice.filter((d) => d === 4)),
    fives: (dice: number[]) => sum(dice.filter((d) => d === 5)),
    sixes: (dice: number[]) => sum(dice.filter((d) => d === 6)),

    onePair: (dice: number[]) => {
      const grouped = groupDice(dice);
      let score = 0;
      if (grouped[0]?.length >= 2) score = grouped[0][0] * 2;
      if (
        grouped.length >= 2 &&
        grouped[1]?.length >= 2 &&
        grouped[1][0] > grouped[0][0]
      )
        score = grouped[1][0] * 2;
      return score;
    },

    twoPairs: (dice: number[]) => {
      const grouped = groupDice(dice);
      if (
        grouped.length >= 2 &&
        grouped[0]?.length >= 2 &&
        grouped[1]?.length === 2
      )
        return grouped[0][0] * 2 + grouped[1][0] * 2;
      return 0;
    },

    threeOfAKind: (dice: number[]) => {
      const grouped = groupDice(dice);
      return grouped[0]?.length >= 3 ? grouped[0][0] * 3 : 0;
    },

    fourOfAKind: (dice: number[]) => {
      const grouped = groupDice(dice);
      return grouped[0]?.length >= 4 ? grouped[0][0] * 4 : 0;
    },

    smallStraight: (dice: number[]) =>
      isEqual([...dice].sort((a, b) => a - b), [1, 2, 3, 4, 5]) ? 15 : 0,

    largeStraight: (dice: number[]) =>
      isEqual([...dice].sort((a, b) => a - b), [2, 3, 4, 5, 6]) ? 20 : 0,

    fullHouse: (dice: number[]) => {
      const grouped = groupDice(dice);
      if (
        grouped.length === 2 &&
        grouped[0]?.length === 3 &&
        grouped[1]?.length === 2
      )
        return sum(dice);
      return 0;
    },

    chance: (dice: number[]) => sum(dice),

    yatzy: (dice: number[]) => {
      const grouped = groupDice(dice);
      return grouped[0]?.length === 5 ? 50 : 0;
    },
  } as Record<ScoringCategory, (dice: number[]) => number>,
};

const createInitialScores = (): Scores => ({
  ones: null,
  twos: null,
  threes: null,
  fours: null,
  fives: null,
  sixes: null,
  onePair: null,
  twoPairs: null,
  threeOfAKind: null,
  fourOfAKind: null,
  smallStraight: null,
  largeStraight: null,
  fullHouse: null,
  chance: null,
  yatzy: null,
});

const scoringCategories: { key: ScoringCategory; label: string }[] = [
  { key: 'ones', label: 'Ones' },
  { key: 'twos', label: 'Twos' },
  { key: 'threes', label: 'Threes' },
  { key: 'fours', label: 'Fours' },
  { key: 'fives', label: 'Fives' },
  { key: 'sixes', label: 'Sixes' },
  { key: 'onePair', label: 'One Pair' },
  { key: 'twoPairs', label: 'Two Pairs' },
  { key: 'threeOfAKind', label: '3 of a Kind' },
  { key: 'fourOfAKind', label: '4 of a Kind' },
  { key: 'smallStraight', label: 'Sm. Straight' },
  { key: 'largeStraight', label: 'Lg. Straight' },
  { key: 'fullHouse', label: 'Full House' },
  { key: 'chance', label: 'Chance' },
  { key: 'yatzy', label: 'Yatzy' },
];

// Bot AI: Choose the best scoring category
const getBotMove = (
  dice: number[],
  scoring: Scores,
): ScoringCategory | null => {
  const available = scoringCategories.filter(
    (cat) => scoring[cat.key] === null,
  );
  if (available.length === 0) return null;

  // Calculate potential scores for each available category
  const scores = available.map((cat) => ({
    key: cat.key,
    score: ScoreCalculator.calculators[cat.key](dice),
  }));

  // Pick the highest scoring option, preferring non-zero scores
  scores.sort((a, b) => b.score - a.score);
  return scores[0].key;
};

export const game = {
  name: 'Yatzy',
  minPlayers: 1,
  maxPlayers: 4,
  setup: ({ ctx }: { ctx: { numPlayers?: number } }): GameState => {
    const numPlayers = ctx?.numPlayers ?? 2;
    const players: Player[] = [];

    // Create all players (bot status determined at runtime by botCount prop)
    for (let i = 0; i < numPlayers; i++) {
      players.push({
        id: i.toString(),
        name: i === 0 ? 'You' : `Player ${i + 1}`,
        isBot: i > 0, // Default: Player 0 is human, rest are bots
        scoring: createInitialScores(),
      });
    }

    return {
      dice: Array(TOTAL_DICE).fill(1),
      diceHeld: Array(TOTAL_DICE).fill(false),
      players,
      totalRolls: 0,
      currentPlayer: 0,
      winner: null,
      isDraw: false,
    };
  },

  moves: {
    rollDice: ({ G, random }: { G: GameState; random: { D6: () => number } }) => {
      if (G.totalRolls >= 3) return;
      for (let d = 0; d < G.dice.length; d++) {
        if (!G.diceHeld[d]) G.dice[d] = random.D6();
      }
      G.totalRolls++;
    },

    selectScore: ({ G }: { G: GameState }, category: ScoringCategory) => {
      const player = G.players[G.currentPlayer];
      if (player.scoring[category] !== null) return;

      const score = ScoreCalculator.calculators[category](G.dice);
      player.scoring[category] = score;

      // Reset dice state
      G.dice = Array(TOTAL_DICE).fill(1);
      G.diceHeld = Array(TOTAL_DICE).fill(false);
      G.totalRolls = 0;

      // Check for game end
      const gameIsOver = G.players.every((p) =>
        Object.values(p.scoring).every((s) => s !== null),
      );

      if (gameIsOver) {
        const scores = G.players.map((p) => ScoreCalculator.calculateTotal(p));
        const topScore = max(scores);
        if (scores.filter((s) => s === topScore).length >= 2) {
          G.isDraw = true;
        } else {
          G.winner = G.players[scores.indexOf(topScore)].id;
        }
      } else {
        // Next player
        G.currentPlayer = (G.currentPlayer + 1) % G.players.length;
      }
    },

    toggleDie: ({ G }: { G: GameState }, dieIndex: number) => {
      if (G.totalRolls === 0 || G.totalRolls >= 3) return;
      G.diceHeld[dieIndex] = !G.diceHeld[dieIndex];
    },

    reset: ({ G }: { G: GameState }) => {
      G.players.forEach((p) => {
        p.scoring = createInitialScores();
      });
      G.dice = Array(TOTAL_DICE).fill(1);
      G.diceHeld = Array(TOTAL_DICE).fill(false);
      G.totalRolls = 0;
      G.currentPlayer = 0;
      G.winner = null;
      G.isDraw = false;
    },
  },

};

// Dice face SVG component
const DiceFace = ({ value }: { value: number }) => {
  const dots: Record<number, JSX.Element> = {
    1: <path d="M12 12h.01" />,
    2: (
      <>
        <path d="M15 9h.01" />
        <path d="M9 15h.01" />
      </>
    ),
    3: (
      <>
        <path d="M16 8h.01" />
        <path d="M12 12h.01" />
        <path d="M8 16h.01" />
      </>
    ),
    4: (
      <>
        <path d="M16 8h.01" />
        <path d="M8 8h.01" />
        <path d="M8 16h.01" />
        <path d="M16 16h.01" />
      </>
    ),
    5: (
      <>
        <path d="M16 8h.01" />
        <path d="M8 8h.01" />
        <path d="M8 16h.01" />
        <path d="M16 16h.01" />
        <path d="M12 12h.01" />
      </>
    ),
    6: (
      <>
        <path d="M16 8h.01" />
        <path d="M16 12h.01" />
        <path d="M16 16h.01" />
        <path d="M8 8h.01" />
        <path d="M8 12h.01" />
        <path d="M8 16h.01" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dots[value]}
    </svg>
  );
};

export function app({ G, moves, playerID, isMultiplayer, botCount = 0 }: BoardProps) {
  const myPlayerIndex = playerID !== null && playerID !== undefined ? parseInt(playerID, 10) : 0;
  const currentPlayer = G.players[G.currentPlayer];
  
  // Determine which players are bots based on botCount (last N players are bots, excluding human)
  const numPlayers = G.players.length;
  const botPlayerIDs = useMemo(
    () => new Set(
      Array.from({ length: Math.min(botCount, numPlayers - 1) }, (_, i) => numPlayers - 1 - i)
    ),
    [botCount, numPlayers]
  );
  const isBot = useCallback(
    (id: number) => id !== myPlayerIndex && botPlayerIDs.has(id),
    [myPlayerIndex, botPlayerIDs]
  );
  
  const isMyTurn = G.currentPlayer === myPlayerIndex && !isBot(G.currentPlayer);
  const gameOver = G.winner !== null || G.isDraw;
  const shouldRunBots = !isMultiplayer && botCount > 0;

  const validCategories = useMemo(
    () =>
      new Set(
        scoringCategories
          .filter((cat) => currentPlayer.scoring[cat.key] === null)
          .map((cat) => cat.key),
      ),
    [currentPlayer.scoring],
  );

  // Bot AI logic
  useEffect(() => {
    if (gameOver || !shouldRunBots || !isBot(G.currentPlayer)) return;

    const botAction = () => {
      // Bot needs to roll first
      if (G.totalRolls < 3) {
        // Simple strategy: roll up to 3 times, keeping high-value dice for potential yatzy/straights
        const grouped = groupDice(G.dice);
        const hasGoodHand =
          grouped[0]?.length >= 3 || // Three of a kind or better
          ScoreCalculator.calculators.smallStraight(G.dice) > 0 ||
          ScoreCalculator.calculators.largeStraight(G.dice) > 0;

        if (G.totalRolls === 0 || (!hasGoodHand && G.totalRolls < 2)) {
          moves.rollDice();
          return;
        }
      }

      // After rolling, select best category
      const bestCategory = getBotMove(G.dice, currentPlayer.scoring);
      if (bestCategory) {
        moves.selectScore(bestCategory);
      }
    };

    const timer = setTimeout(botAction, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [G.dice, G.totalRolls, G.currentPlayer, gameOver, shouldRunBots, isBot, moves, currentPlayer.scoring]);

  return (
    <div className="flex min-h-full w-full flex-col bg-white p-4 pb-8">
      <div className="mx-auto w-full max-w-sm space-y-6">
        {/* Header with turn indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400">
              Turn
            </span>
            <div
              className="h-4 w-8 rounded-md transition-colors duration-300"
              style={{ backgroundColor: PLAYER_COLORS[G.currentPlayer] }}
            />
            <span className="text-xs text-slate-500">
              {G.currentPlayer === myPlayerIndex ? 'You' : isMultiplayer ? `Player ${G.currentPlayer + 1}` : isBot(G.currentPlayer) ? `Bot ${G.currentPlayer}` : currentPlayer.name}
            </span>
          </div>
          <button
            onClick={() => moves.reset()}
            className="text-xs uppercase tracking-widest text-slate-400 hover:text-slate-700"
          >
            Reset
          </button>
        </div>

        {/* Player scorecards */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {G.players.map((player, idx) => (
            <div
              key={player.id}
              className={`flex-1 min-w-0 rounded-lg p-1 transition-opacity duration-300 ${
                G.currentPlayer === idx ? 'opacity-100' : 'opacity-40'
              }`}
              style={{ backgroundColor: PLAYER_COLORS[idx] }}
            >
              <div className="rounded-md bg-white/95 p-2">
                <div className="mb-1 text-center text-[10px] font-medium text-slate-600 truncate">
                  {idx === myPlayerIndex ? 'You' : isMultiplayer ? `Player ${idx + 1}` : isBot(idx) ? `Bot ${idx}` : player.name}
                </div>
                <div className="grid grid-cols-5 gap-0.5 text-[9px]">
                  {scoringCategories.map((cat) => (
                    <span
                      key={cat.key}
                      className={`text-center tabular-nums ${
                        player.scoring[cat.key] === null
                          ? 'text-slate-300'
                          : 'font-semibold text-slate-700'
                      }`}
                    >
                      {player.scoring[cat.key] ?? '-'}
                    </span>
                  ))}
                </div>
                <div className="mt-1 border-t border-slate-200 pt-1 text-center text-[10px] font-bold text-slate-800">
                  {ScoreCalculator.calculateTotal(player)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dice */}
        <div className="grid grid-cols-5 gap-2">
          {G.dice.map((die, index) => {
            const isHeld = G.diceHeld[index];
            const canToggle = G.totalRolls > 0 && G.totalRolls < 3 && isMyTurn;
            return (
              <button
                key={index}
                onClick={() => canToggle && moves.toggleDie(index)}
                disabled={!canToggle}
                className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all duration-200
                  ${isHeld ? 'border-emerald-500 bg-emerald-50 scale-95' : 'border-slate-200 bg-white'}
                  ${canToggle ? 'hover:border-slate-400 active:scale-95' : ''}
                `}
              >
                {G.totalRolls === 0 ? (
                  <span className="text-xl text-slate-300">?</span>
                ) : (
                  <DiceFace value={die} />
                )}
              </button>
            );
          })}
        </div>

        {/* Roll button and indicator */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => moves.rollDice()}
            disabled={G.totalRolls >= 3 || !isMyTurn || gameOver}
            className="rounded-lg bg-slate-900 px-8 py-3 text-sm font-medium text-white transition-all
              hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Roll Dice
          </button>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                  i < G.totalRolls ? 'bg-slate-300' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scoring categories */}
        <div className="grid grid-cols-3 gap-1">
          {scoringCategories.map((cat) => {
            const isValid = validCategories.has(cat.key);
            const potentialScore = ScoreCalculator.calculators[cat.key](G.dice);
            const canSelect = isValid && G.totalRolls > 0 && isMyTurn && !gameOver;

            return (
              <button
                key={cat.key}
                onClick={() => canSelect && moves.selectScore(cat.key)}
                disabled={!canSelect}
                className={`rounded-lg border-2 px-2 py-2 text-left text-xs transition-all duration-150
                  ${
                    canSelect
                      ? 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50'
                      : 'border-transparent bg-slate-50 opacity-40'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-medium text-slate-700">
                    {cat.label}
                  </span>
                  {canSelect && potentialScore > 0 && (
                    <span className="ml-1 text-[10px] font-bold text-emerald-600">
                      +{potentialScore}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Game over state */}
        {gameOver && (
          <div className="rounded-xl bg-slate-100 p-4 text-center">
            {G.isDraw ? (
              <span className="text-sm font-medium text-slate-600">
                It's a draw!
              </span>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-slate-600">Winner:</span>
                <div
                  className="h-4 w-8 rounded"
                  style={{
                    backgroundColor:
                      PLAYER_COLORS[
                        G.players.findIndex((p) => p.id === G.winner)
                      ],
                  }}
                />
                <span className="font-bold text-slate-800">
                  {(() => {
                    const winnerIdx = G.players.findIndex((p) => p.id === G.winner);
                    return winnerIdx === myPlayerIndex ? 'You' : isMultiplayer ? `Player ${winnerIdx + 1}` : isBot(winnerIdx) ? `Bot ${winnerIdx}` : G.players[winnerIdx]?.name;
                  })()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
